/**
 * @file shape-model.ts
 * @description Shape model v2 (plan 2.2): the macro phenotype of macro.ts (unchanged, so shared
 *   parameters give identical bodies) plus breast cup size and firmness, and local modifiers.
 *   Breast macros weight female x age x muscle x weight x cup x firmness, as MakeHuman and Anny do;
 *   the average-cup average-firmness body has no target, so the defaults add nothing. Local
 *   modifiers use opposite-pair ReLU coefficients (adapted from Anny, see NOTICE): value v in
 *   [-1, 1] puts weight max(v, 0) on the increase targets and max(-v, 0) on the decrease targets,
 *   both sides alike; unipolar modifiers take 0..1.
 * @scope cinelab-studio
 * @depends ./macro, ./modifier-catalogue
 */

import { combine, DEFAULT_BODY, macroFactors, macroTargetWeights, twoSided, type BodyParams } from "./macro";
import type { Modifier, ModifierEnds } from "./modifier-catalogue";

export type ShapeParams = BodyParams & {
  /** 0..1, 0.5 = average cup. */
  cupSize?: number;
  /** 0..1, 0.5 = average firmness. */
  firmness?: number;
  /** Modifier id -> value (-1..1, unipolar 0..1); missing = 0. */
  modifiers?: Readonly<Record<string, number>>;
};

export const DEFAULT_SHAPE: Required<ShapeParams> = { ...DEFAULT_BODY, cupSize: 0.5, firmness: 0.5, modifiers: {} };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Breast macro target names (`breast/female-...`) -> weight. */
export function breastTargetWeights(params: ShapeParams): Map<string, number> {
  const { gender, age, muscle, weight } = macroFactors(params);
  const cup = twoSided(clamp(params.cupSize ?? 0.5, 0, 1), "mincup", "averagecup", "maxcup");
  const firmness = twoSided(clamp(params.firmness ?? 0.5, 0, 1), "minfirmness", "averagefirmness", "maxfirmness");
  const out = new Map<string, number>();
  if (!gender.female) return out;
  combine("breast/female-", [age, muscle, weight, cup, firmness], out, gender.female);
  for (const name of [...out.keys()]) if (name.endsWith("-averagecup-averagefirmness")) out.delete(name);
  return out;
}

const add = (out: Map<string, number>, ends: ModifierEnds, weight: number) => {
  if (weight <= 0) return;
  for (const name of [ends.left, ends.right, ends.unsided]) if (name) out.set(name, (out.get(name) ?? 0) + weight);
};

/** Local modifier target names (`<group>/<target>`) -> weight. */
export function modifierTargetWeights(catalogue: readonly Modifier[], values: Readonly<Record<string, number>>): Map<string, number> {
  const out = new Map<string, number>();
  for (const modifier of catalogue) {
    const value = values[modifier.id];
    if (!value) continue;
    if (modifier.kind === "unipolar") {
      add(out, modifier.positive, clamp(value, 0, 1));
    } else {
      const v = clamp(value, -1, 1);
      add(out, modifier.positive, Math.max(v, 0));
      add(out, modifier.negative, Math.max(-v, 0));
    }
  }
  return out;
}

/**
 * All target weights for a body. Without the modifier pack (`catalogue` undefined) only the macro
 * targets are used, exactly as before.
 */
export function shapeTargetWeights(params: ShapeParams, catalogue?: readonly Modifier[]): Map<string, number> {
  const out = macroTargetWeights(params);
  if (!catalogue) return out;
  for (const [name, w] of breastTargetWeights(params)) out.set(name, w);
  for (const [name, w] of modifierTargetWeights(catalogue, params.modifiers ?? {})) out.set(name, (out.get(name) ?? 0) + w);
  return out;
}
