/**
 * @file macro.ts
 * @description Body parameters and their mapping to MakeHuman macro target weights. Each macro
 *   variable splits into two neighbouring categories with linear weights (per macro.json part
 *   ranges); a target's weight is the product of the weights of the categories in its name.
 *   Adults only: age is 18-35 years. MakeHuman has no adult data below 25 (only 11-year child
 *   targets), so 18-25 uses the 25-year body unchanged; 25-35 blends towards the 90-year targets.
 * @scope cinelab-studio
 * @depends none
 */

/** All values 0..1 except `ageYears`; ethnicity weights are normalised to sum 1. */
export type BodyParams = {
  /** 0 = female, 1 = male. */
  gender: number;
  ageYears: number;
  muscle: number;
  weight: number;
  /** 0.5 = average; below uses the min-height targets, above the max-height targets. */
  height: number;
  /** 0.5 = average; below = uncommon, above = ideal proportions. */
  proportions: number;
  african: number;
  asian: number;
  caucasian: number;
};

export const MIN_AGE_YEARS = 18;
export const MAX_AGE_YEARS = 35;

export const DEFAULT_BODY: BodyParams = {
  gender: 0.5,
  ageYears: 25,
  muscle: 0.5,
  weight: 0.5,
  height: 0.5,
  proportions: 0.5,
  african: 1 / 3,
  asian: 1 / 3,
  caucasian: 1 / 3,
};

export type Weights = Record<string, number>;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** MakeHuman age value (0.5 = 25 years, 1 = 90 years); never below 0.5, so no child shape. */
export function ageToMacro(years: number): number {
  const age = Math.min(MAX_AGE_YEARS, Math.max(25, years));
  return 0.5 + ((age - 25) / 65) * 0.5;
}

/** Linear blend between two neighbouring categories inside [from, to]. */
function blend(value: number, from: number, to: number, low: string, high: string): Weights {
  const t = clamp01((value - from) / (to - from));
  return { [low]: 1 - t, [high]: t };
}

const ageWeights = (years: number): Weights => blend(ageToMacro(years), 0.5, 1, "young", "old");

export const twoSided = (value: number, min: string, average: string, max: string) =>
  value < 0.5 ? blend(value, 0, 0.5, min, average) : blend(value, 0.5, 1, average, max);

/** One-sided modifiers: only the extreme on the active side has a target. */
const oneSided = (value: number, low: string, high: string): Weights =>
  value < 0.5 ? { [low]: (0.5 - value) * 2 } : { [high]: (value - 0.5) * 2 };

function ethnicityWeights(params: BodyParams): Weights {
  const raw = { african: Math.max(0, params.african), asian: Math.max(0, params.asian), caucasian: Math.max(0, params.caucasian) };
  const total = raw.african + raw.asian + raw.caucasian;
  if (total <= 0) return { african: 1 / 3, asian: 1 / 3, caucasian: 1 / 3 };
  return { african: raw.african / total, asian: raw.asian / total, caucasian: raw.caucasian / total };
}

/** Cartesian product of category weights, named `prefix + categories.join("-")`, scaled by `scale`. */
export function combine(prefix: string, factors: Weights[], out: Map<string, number>, scale = 1) {
  let entries: Array<[string[], number]> = [[[], scale]];
  for (const factor of factors) {
    const next: Array<[string[], number]> = [];
    for (const [names, weight] of entries) {
      for (const [category, factorWeight] of Object.entries(factor)) {
        if (factorWeight > 0) next.push([[...names, category], weight * factorWeight]);
      }
    }
    entries = next;
  }
  for (const [names, weight] of entries) {
    if (weight > 1e-6) out.set(prefix + names.join("-"), weight);
  }
}

/** Category weights of the four shared macro variables (also used by the breast macros). */
export function macroFactors(params: BodyParams) {
  return {
    gender: { female: 1 - clamp01(params.gender), male: clamp01(params.gender) } as Weights,
    age: ageWeights(params.ageYears),
    muscle: twoSided(clamp01(params.muscle), "minmuscle", "averagemuscle", "maxmuscle"),
    weight: twoSided(clamp01(params.weight), "minweight", "averageweight", "maxweight"),
  };
}

/** Target name (as in the morph manifest) -> weight, for every target with a non-zero weight. */
export function macroTargetWeights(params: BodyParams): Map<string, number> {
  const { gender, age, muscle, weight } = macroFactors(params);
  const body = [gender, age, muscle, weight];
  const out = new Map<string, number>();
  for (const [race, raceWeight] of Object.entries(ethnicityWeights(params))) combine(`${race}-`, [gender, age], out, raceWeight);
  combine("universal-", body, out);
  combine("height/", [...body, oneSided(clamp01(params.height), "minheight", "maxheight")], out);
  combine("proportions/", [...body, oneSided(clamp01(params.proportions), "uncommonproportions", "idealproportions")], out);
  return out;
}
