/**
 * @file body-types.test.ts
 * @description Plan 2.4 acceptance on the real body: switching type keeps the typed cm and kg (all
 *   seven types, female and male), every type modifier is packed, Average adds nothing, types change
 *   the shape, Soft/Heavy/Muscular widen the reachable mass, offsets scale with intensity and gender.
 * @scope cinelab-studio
 * @depends ./body-types, ./anthropometry, ./load-body, ./morph-data, ./shape-model
 */

import { beforeAll, describe, expect, it } from "vitest";
import { buildAssets } from "../../scripts/build-assets.ts";
import { measureTopology, sizeMeasurer } from "./anthropometry";
import type { MeasureSize } from "./body-solver";
import { BODY_TYPE_IDS, BODY_TYPES, bodyTypeModifierIds, switchBodyType, withBodyType } from "./body-types";
import { parseBody, type LoadedBody } from "./load-body";
import { morphSourcePositions } from "./morph-data";
import { DEFAULT_SHAPE, modifierTargetWeights, shapeTargetWeights, type ShapeParams } from "./shape-model";

let body: LoadedBody;
let measure: MeasureSize;
const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

beforeAll(async () => {
  const built = buildAssets();
  body = await parseBody({
    glb: buffer(built.glb), manifest: built.manifest, morphs: buffer(built.morphBin), proxyManifest: built.proxyManifest, proxies: buffer(built.proxyBin),
    modifierManifest: built.modifiers!.manifest, modifiers: buffer(built.modifiers!.bin),
  });
  measure = sizeMeasurer(body.data, measureTopology(body.data));
}, 60_000);

const morph = (params: ShapeParams) => morphSourcePositions(body.data, shapeTargetWeights(params, body.data.modifiers!.catalogue));
const maxDiff = (a: Float32Array, b: Float32Array) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);

describe("body types (plan 2.4)", () => {
  it("uses only packed modifiers", () => {
    const catalogue = body.data.modifiers!.catalogue;
    for (const id of BODY_TYPE_IDS) {
      for (const modifier of bodyTypeModifierIds(BODY_TYPES[id])) {
        const weights = modifierTargetWeights(catalogue, { [modifier]: 1 });
        expect(weights.size, `${id}: ${modifier}`).toBeGreaterThan(0);
        for (const name of weights.keys()) expect(body.data.targets.has(name), name).toBe(true);
      }
    }
  });

  it("adds nothing for Average or zero intensity", () => {
    const plain = morph({ ...DEFAULT_SHAPE, bodyType: undefined });
    expect(maxDiff(morph(DEFAULT_SHAPE), plain)).toBe(0);
    expect(maxDiff(morph({ ...DEFAULT_SHAPE, bodyType: { id: "heavy", intensity: 0 } }), plain)).toBe(0);
  });

  const keeps = [
    { gender: 0, keep: { heightCm: 165, massKg: 55 } },
    { gender: 1, keep: { heightCm: 180, massKg: 74 } },
  ];
  for (const { gender, keep } of keeps) {
    it(`keeps ${keep.heightCm} cm and ${keep.massKg} kg on every type switch (gender ${gender})`, () => {
      const average = switchBodyType({ ...DEFAULT_SHAPE, gender }, { id: "average", intensity: 1 }, keep, measure);
      for (const id of BODY_TYPE_IDS) {
        const result = switchBodyType(average.params, { id, intensity: 1 }, keep, measure);
        expect(result.clamped, id).toEqual({ height: false, mass: false });
        const size = measure(result.params);
        expect(Math.abs(size.heightCm - keep.heightCm), id).toBeLessThan(0.5);
        expect(Math.abs(size.massKg - keep.massKg), id).toBeLessThan(0.5);
        if (id !== "average") expect(maxDiff(morph(result.params), morph(average.params)), id).toBeGreaterThan(0.005);
      }
    });
  }

  it("widens the reachable mass with Soft, Heavy and Muscular", () => {
    for (const { gender, keep } of keeps) {
      const max = (id: "average" | "soft" | "heavy" | "muscular") =>
        switchBodyType({ ...DEFAULT_SHAPE, gender }, { id, intensity: 1 }, keep, measure).ranges.massKg.max;
      const average = max("average");
      for (const id of ["soft", "heavy", "muscular"] as const) expect(max(id), `${gender} ${id}`).toBeGreaterThan(average + 10);
    }
  });

  it("scales offsets with intensity and the female share", () => {
    const half = withBodyType(DEFAULT_SHAPE, { id: "muscular", intensity: 0.5 });
    expect(half.muscle).toBeCloseTo(0.5 + 0.5 * 0.5, 9);
    expect(half.modifiers["torso/torso-muscle-pectoral-decr-incr"]).toBeCloseTo(0.3, 9);
    const female = withBodyType({ ...DEFAULT_SHAPE, gender: 0 }, { id: "curvy", intensity: 1 });
    const male = withBodyType({ ...DEFAULT_SHAPE, gender: 1 }, { id: "curvy", intensity: 1 });
    expect(female.cupSize).toBeCloseTo(0.75, 9);
    expect(male.cupSize).toBe(0.5);
    expect(male.modifiers["torso/measure-hips-circ-decr-incr"]).toBeCloseTo(0.6 * 0.4, 9);
    expect(male.modifiers["torso/measure-bust-circ-decr-incr"]).toBeUndefined();
    const own = withBodyType({ ...DEFAULT_SHAPE, modifiers: { "torso/torso-vshape-decr-incr": 0.2 } }, { id: "athletic", intensity: 1 });
    expect(own.modifiers["torso/torso-vshape-decr-incr"]).toBeCloseTo(0.6, 9);
  });
});
