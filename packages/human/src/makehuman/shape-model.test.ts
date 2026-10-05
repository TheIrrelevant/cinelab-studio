/**
 * @file shape-model.test.ts
 * @description Plan 2.2 shape model v2 on the real packs: shared parameters give exactly the macro
 *   model's body, every modifier resolves to packed targets at both ends, ReLU pairs weight one
 *   side only, breast cup and firmness shape female chests (not male), defaults add nothing.
 * @scope cinelab-studio
 * @depends ./shape-model, ./macro, ./morph-data, ./load-body
 */

import { beforeAll, describe, expect, it } from "vitest";
import { buildAssets } from "../../scripts/build-assets.ts";
import { parseBody, type LoadedBody } from "./load-body";
import { DEFAULT_BODY, macroTargetWeights, type BodyParams } from "./macro";
import { morphSourcePositions } from "./morph-data";
import { breastTargetWeights, DEFAULT_SHAPE, modifierTargetWeights, shapeTargetWeights, type ShapeParams } from "./shape-model";

let body: LoadedBody;
const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

beforeAll(async () => {
  const built = buildAssets();
  body = await parseBody({
    glb: buffer(built.glb), manifest: built.manifest, morphs: buffer(built.morphBin), proxyManifest: built.proxyManifest, proxies: buffer(built.proxyBin),
    modifierManifest: built.modifiers!.manifest, modifiers: buffer(built.modifiers!.bin),
  });
}, 60_000);

const catalogue = () => body.data.modifiers!.catalogue;
const morph = (params: ShapeParams) => morphSourcePositions(body.data, shapeTargetWeights(params, catalogue()));
const maxDiff = (a: Float32Array, b: Float32Array) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);

describe("shape model v2 (plan 2.2)", () => {
  it("matches the macro model exactly for shared parameters", () => {
    const samples: Partial<BodyParams>[] = [{}, { gender: 0, height: 0.9, weight: 0.2 }, { gender: 1, ageYears: 33, muscle: 0.8, proportions: 0.1 }, { gender: 0.3, african: 0.6, asian: 0.4, caucasian: 0 }];
    for (const sample of samples) {
      const params = { ...DEFAULT_BODY, ...sample };
      expect(maxDiff(morph({ ...DEFAULT_SHAPE, ...params }), morphSourcePositions(body.data, macroTargetWeights(params)))).toBe(0);
    }
  });

  it("resolves every modifier to packed targets at both ends", () => {
    for (const modifier of catalogue()) {
      for (const value of modifier.kind === "unipolar" ? [1] : [-1, 1]) {
        const weights = modifierTargetWeights(catalogue(), { [modifier.id]: value });
        expect(weights.size, `${modifier.id} ${value}`).toBeGreaterThan(0);
        for (const name of weights.keys()) expect(body.data.targets.has(name), name).toBe(true);
      }
    }
  });

  it("weights only the active end of a pair, on both sides", () => {
    const eye = catalogue().find((m) => m.id === "eyes/eye-scale-decr-incr")!;
    const up = modifierTargetWeights(catalogue(), { [eye.id]: 0.4 });
    expect(Object.fromEntries(up)).toEqual({ [eye.positive.left!]: 0.4, [eye.positive.right!]: 0.4 });
    const down = modifierTargetWeights(catalogue(), { [eye.id]: -2 });
    expect(Object.fromEntries(down)).toEqual({ [eye.negative.left!]: 1, [eye.negative.right!]: 1 });
  });

  it("changes the body with a modifier and leaves it unchanged at 0", () => {
    const nose = "nose/nose-scale-horiz-decr-incr";
    expect(maxDiff(morph({ ...DEFAULT_SHAPE, modifiers: { [nose]: 0 } }), morph(DEFAULT_SHAPE))).toBe(0);
    expect(maxDiff(morph({ ...DEFAULT_SHAPE, modifiers: { [nose]: 1 } }), morph(DEFAULT_SHAPE))).toBeGreaterThan(0.002);
  });

  it("shapes female breasts with cup size and firmness, not male chests", () => {
    expect(breastTargetWeights(DEFAULT_SHAPE).size).toBe(0);
    const female = { ...DEFAULT_SHAPE, gender: 0 };
    expect(maxDiff(morph({ ...female, cupSize: 1 }), morph(female))).toBeGreaterThan(0.01);
    expect(maxDiff(morph({ ...female, firmness: 0 }), morph(female))).toBeGreaterThan(0.003);
    expect(breastTargetWeights({ ...DEFAULT_SHAPE, gender: 1, cupSize: 1 }).size).toBe(0);
    for (const name of breastTargetWeights({ ...female, cupSize: 0.2, firmness: 0.9, ageYears: 35 }).keys()) expect(body.data.targets.has(name), name).toBe(true);
  });
});
