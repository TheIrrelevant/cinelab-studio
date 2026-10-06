/**
 * @file body-regions.test.ts
 * @description Plan 2.5 data on the real body: every region control is packed and changes the body
 *   (female body for breast controls), the waist control moves the measured waist the labelled way,
 *   region reset restores the body exactly; ethnicity presets load mix and appearance, clear head
 *   modifiers only, and use hairstyles and eye colours that exist in the generated assets.
 * @scope cinelab-studio
 * @depends ./body-regions, ./ethnic-presets, ./anthropometry, ./load-body, ./shape-model
 */

import { beforeAll, describe, expect, it } from "vitest";
import { buildAssets } from "../../scripts/build-assets.ts";
import { measureShape, measureTopology, type MeasureTopology } from "./anthropometry";
import { DEFAULT_APPEARANCE, appearanceCatalog } from "./appearance";
import { BODY_REGIONS, regionNeutral, regionValue, resetRegion, withRegionValue } from "./body-regions";
import { applyEthnicPreset, ETHNIC_PRESET_IDS, ETHNIC_PRESETS, matchEthnicPreset } from "./ethnic-presets";
import { parseBody, type LoadedBody } from "./load-body";
import { morphSourcePositions } from "./morph-data";
import { DEFAULT_SHAPE, modifierTargetWeights, shapeTargetWeights, type ShapeParams } from "./shape-model";

let body: LoadedBody;
let topology: MeasureTopology;
const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

beforeAll(async () => {
  const built = buildAssets();
  body = await parseBody({
    glb: buffer(built.glb), manifest: built.manifest, morphs: buffer(built.morphBin), proxyManifest: built.proxyManifest, proxies: buffer(built.proxyBin),
    modifierManifest: built.modifiers!.manifest, modifiers: buffer(built.modifiers!.bin),
  });
  topology = measureTopology(body.data, body.mesh.geometry.getIndex()!.array);
}, 60_000);

const morph = (params: ShapeParams) => morphSourcePositions(body.data, shapeTargetWeights(params, body.data.modifiers!.catalogue));
const maxDiff = (a: Float32Array, b: Float32Array) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);
const female = { ...DEFAULT_SHAPE, gender: 0 };

describe("body regions (plan 2.5)", () => {
  it("packs every region modifier", () => {
    for (const control of BODY_REGIONS.flatMap((r) => r.controls)) {
      if (control.kind !== "modifier") continue;
      for (const value of [-1, 1]) {
        const weights = modifierTargetWeights(body.data.modifiers!.catalogue, { [control.id]: value });
        expect(weights.size, control.id).toBeGreaterThan(0);
        for (const name of weights.keys()) expect(body.data.targets.has(name), name).toBe(true);
      }
    }
  });

  it("changes the body with every control at both ends", () => {
    const base = morph(female);
    for (const control of BODY_REGIONS.flatMap((r) => r.controls)) {
      for (const value of control.kind === "param" ? [0, 1] : [-1, 1]) {
        expect(maxDiff(morph(withRegionValue(female, control, value)), base), `${control.label} ${value}`).toBeGreaterThan(0.002);
      }
    }
  });

  it("moves the measured waist the labelled way and resets exactly", () => {
    const waist = BODY_REGIONS.find((r) => r.id === "waist")!;
    const control = waist.controls[0];
    const wide = withRegionValue(female, control, 1);
    expect(regionValue(wide, control)).toBe(1);
    expect(measureShape(body.data, topology, wide).waistCm).toBeGreaterThan(measureShape(body.data, topology, female).waistCm + 3);
    expect(measureShape(body.data, topology, withRegionValue(female, control, -1)).waistCm).toBeLessThan(measureShape(body.data, topology, female).waistCm - 3);
    const reset = resetRegion(wide, waist);
    expect(waist.controls.every((c) => regionValue(reset, c) === regionNeutral(c))).toBe(true);
    expect(maxDiff(morph(reset), morph(female))).toBe(0);
  });
});

describe("ethnicity presets (plan 2.5)", () => {
  it("loads mix and appearance, clears head modifiers and keeps the body", () => {
    const shape = { ...DEFAULT_SHAPE, gender: 1, weight: 0.7, modifiers: { "nose/nose-scale-horiz-decr-incr": 0.5, "torso/torso-vshape-decr-incr": 0.4 } };
    const { shape: next, appearance } = applyEthnicPreset(shape, DEFAULT_APPEARANCE, "latin");
    expect(next).toEqual({ ...shape, african: 0.15, asian: 0.2, caucasian: 0.65, modifiers: { "torso/torso-vshape-decr-incr": 0.4 } });
    expect(appearance).toMatchObject({ hair: "short02", skinTone: 0.42, eyeColour: "darkbrown" });
    expect(applyEthnicPreset({ ...shape, gender: 0 }, DEFAULT_APPEARANCE, "latin").appearance.hair).toBe("long01");
    expect(matchEthnicPreset(next)).toBe("latin");
    expect(matchEthnicPreset({ ...next, asian: 0.3 })).toBeNull();
  });

  it("uses hairstyles and eye colours that exist in the assets", () => {
    const catalog = appearanceCatalog(body.proxyManifest);
    for (const id of ETHNIC_PRESET_IDS) {
      const preset = ETHNIC_PRESETS[id];
      expect(catalog.hair, id).toEqual(expect.arrayContaining([preset.hair.female, preset.hair.male]));
      expect(catalog.eyeColours, id).toContain(preset.eyeColour);
    }
  });
});
