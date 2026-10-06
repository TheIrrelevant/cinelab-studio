/**
 * @file head-regions.test.ts
 * @description Plan 2.6 acceptance on the real packs: every head modifier is reachable from exactly
 *   one head control, labels are unique per group, every control changes the head at its extreme,
 *   sided modifiers move both sides; face-shape presets set one shape and clear the others.
 * @scope cinelab-studio
 * @depends ./head-regions, ./body-regions, ./load-body, ./morph-data, ./shape-model
 */

import { beforeAll, describe, expect, it } from "vitest";
import { buildAssets } from "../../scripts/build-assets.ts";
import { withRegionValue } from "./body-regions";
import { applyFaceShape, currentFaceShape, FACE_SHAPE_IDS, FACE_SHAPE_STRENGTH, headRegions } from "./head-regions";
import { parseBody, type LoadedBody } from "./load-body";
import type { Modifier } from "./modifier-catalogue";
import { morphSourcePositions } from "./morph-data";
import { DEFAULT_SHAPE, modifierTargetWeights, shapeTargetWeights, type ShapeParams } from "./shape-model";

let body: LoadedBody;
let catalogue: Modifier[];
const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

beforeAll(async () => {
  const built = buildAssets();
  body = await parseBody({
    glb: buffer(built.glb), manifest: built.manifest, morphs: buffer(built.morphBin), proxyManifest: built.proxyManifest, proxies: buffer(built.proxyBin),
    modifierManifest: built.modifiers!.manifest, modifiers: buffer(built.modifiers!.bin),
  });
  catalogue = body.data.modifiers!.catalogue;
}, 60_000);

const morph = (params: ShapeParams) => morphSourcePositions(body.data, shapeTargetWeights(params, catalogue));
const maxDiff = (a: Float32Array, b: Float32Array) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);

describe("head regions (plan 2.6)", () => {
  it("reaches every head modifier exactly once with unique labels per group", () => {
    const regions = headRegions(catalogue);
    expect(regions.map((r) => r.label)).toEqual(["Head shape", "Forehead", "Eyebrows", "Eyes", "Nose", "Cheeks", "Mouth", "Chin", "Ears", "Neck"]);
    const ids = regions.flatMap((r) => r.controls.map((c) => (c.kind === "modifier" ? c.id : "")));
    expect(ids.sort()).toEqual(catalogue.filter((m) => m.section === "head").map((m) => m.id).sort());
    for (const region of regions) {
      const labels = region.controls.map((c) => c.label);
      expect(new Set(labels).size, `${region.label}: ${labels.join(", ")}`).toBe(labels.length);
      for (const label of labels) expect(label, region.label).not.toMatch(/^Trans|incr|decr|-/);
    }
  });

  it("changes the head with every control at its extreme, both sides for sided modifiers", () => {
    const base = morph(DEFAULT_SHAPE);
    for (const control of headRegions(catalogue).flatMap((r) => r.controls)) {
      if (control.kind !== "modifier") continue;
      for (const value of control.unipolar ? [1] : [-1, 1]) {
        expect(maxDiff(morph(withRegionValue(DEFAULT_SHAPE, control, value)), base), `${control.label} ${value}`).toBeGreaterThan(0.0005);
      }
      const modifier = catalogue.find((m) => m.id === control.id)!;
      if (modifier.sided) expect(modifierTargetWeights(catalogue, { [control.id]: 1 }).size).toBe(2);
    }
  });

  it("sets one face shape and clears the others", () => {
    const heart = applyFaceShape(DEFAULT_SHAPE, "heart");
    expect(heart.modifiers).toEqual({ "head/head-invertedtriangular": FACE_SHAPE_STRENGTH });
    const round = applyFaceShape({ ...heart, modifiers: { ...heart.modifiers, "nose/nose-hump-decr-incr": 0.3 } }, "round");
    expect(round.modifiers).toEqual({ "head/head-round": FACE_SHAPE_STRENGTH, "nose/nose-hump-decr-incr": 0.3 });
    expect(currentFaceShape(round)).toBe("round");
    expect(currentFaceShape(applyFaceShape(round, null))).toBeNull();
    for (const id of FACE_SHAPE_IDS) expect(maxDiff(morph(applyFaceShape(DEFAULT_SHAPE, id)), morph(DEFAULT_SHAPE)), id).toBeGreaterThan(0.002);
  });

});
