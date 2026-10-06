/**
 * @file body-solver.test.ts
 * @description Plan 2.3 acceptance: typed height and weight solve to a body within 0.5 cm and 0.5 kg
 *   (measured on the mesh), keep every other parameter, and out-of-range input is clamped to the
 *   reported feasible range. A synthetic measure checks the root finder on its own.
 * @scope cinelab-studio
 * @depends ./body-solver, ./anthropometry, ./load-body, ./shape-model
 */

import { beforeAll, describe, expect, it } from "vitest";
import { buildAssets } from "../../scripts/build-assets.ts";
import { measureTopology, sizeMeasurer } from "./anthropometry";
import { solveBody, type MeasureSize } from "./body-solver";
import { parseBody } from "./load-body";
import { DEFAULT_SHAPE, type ShapeParams } from "./shape-model";

let measure: MeasureSize;
const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

beforeAll(async () => {
  const built = buildAssets();
  const body = await parseBody({
    glb: buffer(built.glb), manifest: built.manifest, morphs: buffer(built.morphBin), proxyManifest: built.proxyManifest, proxies: buffer(built.proxyBin),
    modifierManifest: built.modifiers!.manifest, modifiers: buffer(built.modifiers!.bin),
  });
  measure = sizeMeasurer(body.data, measureTopology(body.data, body.mesh.geometry.getIndex()!.array));
}, 60_000);

/** Kinked but monotone synthetic body: height from `height`, mass from both. */
const synthetic: MeasureSize = (p) => {
  const h = 150 + 50 * (p.height < 0.5 ? p.height * 0.8 : 0.4 + (p.height - 0.5) * 1.2);
  return { heightCm: h, massKg: 30 + 40 * (p.weight ?? 0.5) ** 1.5 + 0.3 * (h - 150) };
};

describe("body solver (plan 2.3)", () => {
  it("finds the root of a synthetic kinked body", () => {
    const result = solveBody(DEFAULT_SHAPE, { heightCm: 172, massKg: 55 }, synthetic);
    expect(Math.abs(result.size.heightCm - 172)).toBeLessThan(0.05);
    expect(Math.abs(result.size.massKg - 55)).toBeLessThan(0.05);
    expect(result.clamped).toEqual({ height: false, mass: false });
  });

  const cases: Array<{ base: Partial<ShapeParams>; heightCm: number; massKg: number }> = [
    { base: { gender: 0 }, heightCm: 165, massKg: 52 },
    { base: { gender: 1 }, heightCm: 182, massKg: 72 },
    { base: { gender: 1, muscle: 0.9, ageYears: 30 }, heightCm: 178, massKg: 85 },
    { base: { gender: 0.4, proportions: 0.8, african: 1, asian: 0, caucasian: 0 }, heightCm: 158, massKg: 50 },
  ];
  for (const { base, heightCm, massKg } of cases) {
    it(`solves ${heightCm} cm / ${massKg} kg for ${JSON.stringify(base)} within 0.5 cm and 0.5 kg`, () => {
      const start = { ...DEFAULT_SHAPE, ...base };
      const result = solveBody(start, { heightCm, massKg }, measure);
      expect(result.clamped).toEqual({ height: false, mass: false });
      const check = measure(result.params);
      expect(Math.abs(check.heightCm - heightCm)).toBeLessThan(0.5);
      expect(Math.abs(check.massKg - massKg)).toBeLessThan(0.5);
      expect({ ...result.params, height: 0, weight: 0 }).toEqual({ ...start, height: 0, weight: 0 });
      expect(result.evaluations).toBeLessThan(80);
    });
  }

  it("clamps out-of-range input to the reported range and says so", () => {
    const female = { ...DEFAULT_SHAPE, gender: 0 };
    const result = solveBody(female, { heightCm: 400, massKg: 5 }, measure);
    expect(result.clamped).toEqual({ height: true, mass: true });
    expect(result.target.heightCm).toBeCloseTo(result.ranges.heightCm.max, 6);
    expect(result.target.massKg).toBeCloseTo(result.ranges.massKg.min, 6);
    expect(Math.abs(result.size.heightCm - result.target.heightCm)).toBeLessThan(0.5);
    expect(Math.abs(result.size.massKg - result.target.massKg)).toBeLessThan(0.5);
  });

  it("reports a feasible range that depends on gender", () => {
    const female = solveBody({ ...DEFAULT_SHAPE, gender: 0 }, { heightCm: 170, massKg: 60 }, measure);
    const male = solveBody({ ...DEFAULT_SHAPE, gender: 1 }, { heightCm: 170, massKg: 60 }, measure);
    expect(male.ranges.massKg.max).toBeGreaterThan(female.ranges.massKg.max);
    expect(female.ranges.heightCm.min).toBeLessThan(170);
    expect(female.ranges.heightCm.max).toBeGreaterThan(170);
  });
});
