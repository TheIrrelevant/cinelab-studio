/**
 * @file body-solver.ts
 * @description Typed height (cm) and weight (kg) -> shape parameters (plan 2.3). Every other
 *   parameter (gender, age, muscle, proportions, ethnicity, breast, modifiers) stays as given, so the
 *   feasible range belongs to the current gender and body type. Height grows with the `height`
 *   parameter and mass with `weight`, both monotone, so each is a bracketed 1D root (Illinois
 *   regula falsi): the inner solve finds `height` for a given `weight`, the outer solve finds
 *   `weight` whose height-matched body has the typed mass. Out-of-range input is clamped and
 *   reported.
 * @scope cinelab-studio
 * @depends ./shape-model
 */

import type { ShapeParams } from "./shape-model";

export type BodySize = { heightCm: number; massKg: number };
/** Measures a body; the caller morphs and measures (see `createSizeMeasurer`). */
export type MeasureSize = (params: ShapeParams) => BodySize;
export type Range = { min: number; max: number };

export type SolveResult = {
  params: ShapeParams;
  /** Measured size of the solved body. */
  size: BodySize;
  /** Request after clamping to the feasible ranges. */
  target: BodySize;
  clamped: { height: boolean; mass: boolean };
  /** Feasible height for the solved weight; feasible mass for the solved height. */
  ranges: { heightCm: Range; massKg: Range };
  evaluations: number;
};

/** Solver tolerances, well inside the 0.5 cm / 0.5 kg acceptance. */
export const HEIGHT_TOLERANCE_CM = 0.05;
export const MASS_TOLERANCE_KG = 0.05;
const MAX_STEPS = 40;

type Root<T> = { x: number; value: number; payload: T };
type Sample<T> = { value: number; payload: T };

/**
 * Root of increasing f on [0, 1], given f(0) <= 0 <= f(1). Returns the best sample seen, so its
 * payload (the measured body) always belongs to the returned x.
 */
function bracketedRoot<T>(f: (x: number) => Sample<T>, at0: Sample<T>, at1: Sample<T>, tolerance: number): Root<T> {
  let [a, fa, b, fb] = [0, at0.value, 1, at1.value];
  let side = 0;
  let best: Root<T> = Math.abs(fa) < Math.abs(fb) ? { x: a, ...at0 } : { x: b, ...at1 };
  for (let step = 0; step < MAX_STEPS && Math.abs(best.value) > tolerance; step += 1) {
    const x = fb === fa ? (a + b) / 2 : b - (fb * (b - a)) / (fb - fa);
    const sample = f(x);
    if (Math.abs(sample.value) < Math.abs(best.value)) best = { x, ...sample };
    if (sample.value < 0) {
      [a, fa] = [x, sample.value];
      if (side === -1) fb /= 2;
      side = -1;
    } else {
      [b, fb] = [x, sample.value];
      if (side === 1) fa /= 2;
      side = 1;
    }
  }
  return best;
}

const clampTo = (value: number, range: Range) => Math.min(range.max, Math.max(range.min, value));

export function solveBody(base: ShapeParams, request: BodySize, measure: MeasureSize): SolveResult {
  let evaluations = 0;
  const size = (height: number, weight: number) => {
    evaluations += 1;
    return measure({ ...base, height, weight });
  };

  type Fit = { height: number; size: BodySize; range: Range };
  /** Height parameter matching `heightCm` at this weight (clamped), with its measured size. */
  const fitHeight = (weight: number, heightCm: number): Fit => {
    const low = size(0, weight);
    const high = size(1, weight);
    const range = { min: low.heightCm, max: high.heightCm };
    const goal = clampTo(heightCm, range);
    const sample = (s: BodySize) => ({ value: s.heightCm - goal, payload: s });
    const root = bracketedRoot((x) => sample(size(x, weight)), sample(low), sample(high), HEIGHT_TOLERANCE_CM);
    return { height: root.x, size: root.payload, range };
  };

  // The height range at the starting weight decides the height goal; the mass range is taken at it.
  const startWeight = base.weight ?? 0.5;
  const startRange = { min: size(0, startWeight).heightCm, max: size(1, startWeight).heightCm };
  const heightGoal = clampTo(request.heightCm, startRange);
  const light = fitHeight(0, heightGoal);
  const heavy = fitHeight(1, heightGoal);
  const massRange = { min: light.size.massKg, max: heavy.size.massKg };
  const massGoal = clampTo(request.massKg, massRange);
  const sample = (fit: Fit) => ({ value: fit.size.massKg - massGoal, payload: fit });
  const root = bracketedRoot((w) => sample(fitHeight(w, heightGoal)), sample(light), sample(heavy), MASS_TOLERANCE_KG);
  const solved = root.payload;
  const target = { heightCm: clampTo(heightGoal, solved.range), massKg: massGoal };

  return {
    params: { ...base, height: solved.height, weight: root.x },
    size: solved.size,
    target,
    clamped: { height: target.heightCm !== request.heightCm, mass: massGoal !== request.massKg },
    ranges: { heightCm: solved.range, massKg: massRange },
    evaluations,
  };
}
