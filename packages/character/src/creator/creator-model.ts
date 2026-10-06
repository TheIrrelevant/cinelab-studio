/**
 * @file creator-model.ts
 * @description Pure state of the character creator (plan 2.5): body shape, appearance and the
 *   locked size (typed cm and kg). Every body change goes through `keepSize`, which re-solves the
 *   height and weight parameters so the locked cm/kg stay (clamped to the feasible range with a
 *   note). Persistence arrives with character data v2 (plan 2.9).
 * @scope cinelab-studio
 * @depends @cinelab/human (shape-model, appearance, body-solver, ethnic-presets)
 */

import { DEFAULT_APPEARANCE, type Appearance } from "@cinelab/human/makehuman/appearance";
import { solveBody, type BodySize, type MeasureSize } from "@cinelab/human/makehuman/body-solver";
import { applyEthnicPreset } from "@cinelab/human/makehuman/ethnic-presets";
import { DEFAULT_SHAPE, type ShapeParams } from "@cinelab/human/makehuman/shape-model";

export type Shape = Required<ShapeParams>;

export type CreatorState = {
  shape: Shape;
  appearance: Appearance;
  /** Typed (locked) size; null until the body is first measured. */
  size: BodySize | null;
  /** Shown when the locked size had to be clamped. */
  note: string | null;
};

/** The creator opens on the European female standard model. */
export function initialCreatorState(): CreatorState {
  const loaded = applyEthnicPreset({ ...DEFAULT_SHAPE, gender: 0 }, DEFAULT_APPEARANCE, "european");
  return { shape: loaded.shape, appearance: loaded.appearance, size: null, note: null };
}

const range = (r: { min: number; max: number }, digits: number, unit: string) => `${r.min.toFixed(digits)}-${r.max.toFixed(digits)} ${unit}`;

/**
 * `shape` with height and weight re-solved for `size`. The requested size stays locked even when it
 * is clamped, so a later change (another body type) can still reach it. Without a measurer or size
 * (body not loaded yet) the shape is taken as is.
 */
export function keepSize(state: CreatorState, shape: Shape, measure: MeasureSize | null, size = state.size): CreatorState {
  if (!measure || !size) return { ...state, shape };
  const result = solveBody(shape, size, measure);
  const notes = [
    result.clamped.height ? `Height limited to ${range(result.ranges.heightCm, 0, "cm")}.` : "",
    result.clamped.mass ? `Weight limited to ${range(result.ranges.massKg, 1, "kg")} for this body.` : "",
  ].filter(Boolean);
  return {
    ...state,
    shape: { ...shape, height: result.params.height ?? shape.height, weight: result.params.weight ?? shape.weight },
    size,
    note: notes.length ? notes.join(" ") : null,
  };
}
