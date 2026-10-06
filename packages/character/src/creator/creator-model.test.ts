/**
 * @file creator-model.test.ts
 * @description Plan 2.5 creator state with a synthetic measurer: the initial model is the European
 *   female preset, `keepSize` re-solves height/weight to the locked size, keeps the request locked
 *   when clamped and explains the clamp, and passes shapes through before the body is loaded.
 * @scope cinelab-studio
 * @depends ./creator-model
 */

import { describe, expect, it } from "vitest";
import type { MeasureSize } from "@cinelab/human/makehuman/body-solver";
import { initialCreatorState, keepSize } from "./creator-model";

/** Height from `height`, mass from `weight` and `muscle`. */
const measure: MeasureSize = (p) => ({ heightCm: 150 + 40 * p.height, massKg: 40 + 30 * (p.weight ?? 0.5) + 20 * (p.muscle - 0.5) });

describe("creator model (plan 2.5)", () => {
  it("opens on the European female standard model", () => {
    const state = initialCreatorState();
    expect(state.shape).toMatchObject({ gender: 0, african: 0, asian: 0, caucasian: 1 });
    expect(state.appearance).toMatchObject({ eyeColour: "blue", hair: "ponytail01" });
    expect(state.size).toBeNull();
  });

  it("re-solves height and weight to the locked size", () => {
    const state = { ...initialCreatorState(), size: { heightCm: 170, massKg: 60 } };
    const next = keepSize(state, { ...state.shape, muscle: 0.8 }, measure);
    expect(measure(next.shape).heightCm).toBeCloseTo(170, 1);
    expect(measure(next.shape).massKg).toBeCloseTo(60, 1);
    expect(next.shape.muscle).toBe(0.8);
    expect(next.note).toBeNull();
  });

  it("keeps the request locked when it is clamped and says why", () => {
    const state = { ...initialCreatorState(), size: { heightCm: 170, massKg: 95 } };
    const next = keepSize(state, state.shape, measure);
    expect(next.size).toEqual({ heightCm: 170, massKg: 95 });
    expect(next.note).toMatch(/^Weight limited to 40.0-70.0 kg/);
    expect(next.shape.weight).toBe(1);
  });

  it("takes the shape as is before the body is measured", () => {
    const state = initialCreatorState();
    const shape = { ...state.shape, muscle: 0.9 };
    expect(keepSize(state, shape, null).shape).toBe(shape);
  });
});
