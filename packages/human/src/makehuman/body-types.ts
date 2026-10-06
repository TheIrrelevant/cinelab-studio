/**
 * @file body-types.ts
 * @description Named body types (plan 2.4, decision D2): Slim, Average, Athletic, Muscular, Curvy,
 *   Soft, Heavy. A type is a set of offsets on top of the user's own values - muscle and proportions
 *   macros, breast cup (female share only) and local modifiers - scaled by an intensity 0..1. Height
 *   and weight are not part of a type: they stay as typed and are re-solved after a switch (see
 *   `switchBodyType`). Average adds nothing, so a body without a type is unchanged.
 * @scope cinelab-studio
 * @depends ./shape-model (types), ./body-solver
 */

import { solveBody, type BodySize, type MeasureSize, type SolveResult } from "./body-solver";
import type { ShapeParams } from "./shape-model";

export const BODY_TYPE_IDS = ["slim", "average", "athletic", "muscular", "curvy", "soft", "heavy"] as const;
export type BodyTypeId = (typeof BODY_TYPE_IDS)[number];
export type BodyTypeChoice = { id: BodyTypeId; /** 0..1 */ intensity: number };

type Offsets = Readonly<Record<string, number>>;
export type BodyTypeSpec = {
  label: string;
  muscle?: number;
  proportions?: number;
  /** Breast cup offset, applied to the female share of the body only. */
  cup?: number;
  modifiers: Offsets;
  /** Extra modifier offsets for the female share. */
  female?: Offsets;
  /** Male share of the type's effect (default 1); Curvy is mostly a female shape. */
  maleScale?: number;
};

const FAT_LIMBS = { "arms/upperarm-fat-decr-incr": 1, "arms/lowerarm-fat-decr-incr": 0.5, "legs/upperleg-fat-decr-incr": 1, "legs/lowerleg-fat-decr-incr": 0.5 };
const scaled = (offsets: Offsets, factor: number): Offsets => Object.fromEntries(Object.entries(offsets).map(([id, v]) => [id, v * factor]));

export const BODY_TYPES: Readonly<Record<BodyTypeId, BodyTypeSpec>> = {
  slim: {
    label: "Slim",
    muscle: -0.2,
    modifiers: {
      ...scaled(FAT_LIMBS, -0.4),
      "torso/torso-scale-horiz-decr-incr": -0.3,
      "torso/measure-shoulder-dist-decr-incr": -0.2,
      "torso/measure-waist-circ-decr-incr": -0.2,
      "torso/measure-hips-circ-decr-incr": -0.3,
      "legs/measure-thigh-circ-decr-incr": -0.3,
    },
  },
  average: { label: "Average", modifiers: {} },
  athletic: {
    label: "Athletic",
    muscle: 0.25,
    proportions: 0.2,
    modifiers: {
      ...scaled(FAT_LIMBS, -0.3),
      "torso/torso-vshape-decr-incr": 0.4,
      "torso/measure-shoulder-dist-decr-incr": 0.2,
      "torso/measure-waist-circ-decr-incr": -0.3,
    },
  },
  muscular: {
    label: "Muscular",
    muscle: 0.5,
    modifiers: {
      "arms/upperarm-fat-decr-incr": -0.3,
      "torso/measure-shoulder-dist-decr-incr": 0.4,
      "torso/torso-muscle-pectoral-decr-incr": 0.6,
      "torso/torso-muscle-dorsi-decr-incr": 0.5,
      "torso/torso-vshape-decr-incr": 0.5,
      "arms/upperarm-muscle-decr-incr": 0.6,
      "arms/upperarm-shoulder-muscle-decr-incr": 0.5,
      "arms/lowerarm-muscle-decr-incr": 0.4,
      "legs/upperleg-muscle-decr-incr": 0.5,
      "legs/lowerleg-muscle-decr-incr": 0.4,
      "neck/measure-neck-circ-decr-incr": 0.3,
    },
  },
  curvy: {
    label: "Curvy",
    proportions: 0.2,
    cup: 0.25,
    maleScale: 0.4,
    modifiers: {
      "torso/measure-hips-circ-decr-incr": 0.6,
      "hip/hip-scale-horiz-decr-incr": 0.3,
      "torso/measure-waist-circ-decr-incr": -0.4,
      "buttocks/buttocks-volume-decr-incr": 0.6,
      "legs/measure-thigh-circ-decr-incr": 0.3,
      "legs/upperleg-fat-decr-incr": 0.3,
    },
    female: { "torso/measure-bust-circ-decr-incr": 0.2 },
  },
  soft: {
    label: "Soft",
    muscle: -0.25,
    cup: 0.15,
    modifiers: {
      ...scaled(FAT_LIMBS, 0.6),
      "stomach/stomach-pregnant-decr-incr": 0.5,
      "torso/measure-waist-circ-decr-incr": 0.6,
      "torso/measure-hips-circ-decr-incr": 0.3,
      "torso/measure-bust-circ-decr-incr": 0.3,
      "buttocks/buttocks-volume-decr-incr": 0.3,
      "neck/neck-double-decr-incr": 0.4,
    },
  },
  heavy: {
    label: "Heavy",
    muscle: 0.3,
    modifiers: {
      ...scaled(FAT_LIMBS, 0.4),
      "stomach/stomach-pregnant-decr-incr": 0.4,
      "torso/measure-waist-circ-decr-incr": 0.5,
      "torso/torso-scale-horiz-decr-incr": 0.4,
      "torso/torso-scale-depth-decr-incr": 0.4,
      "torso/measure-bust-circ-decr-incr": 0.4,
      "torso/measure-shoulder-dist-decr-incr": 0.3,
      "neck/measure-neck-circ-decr-incr": 0.5,
      "neck/neck-double-decr-incr": 0.3,
    },
  },
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Every modifier id a type uses (for catalogue checks). */
export const bodyTypeModifierIds = (spec: BodyTypeSpec) => [...Object.keys(spec.modifiers), ...Object.keys(spec.female ?? {})];

/** Parameters with the chosen type's offsets added; without a type they are returned unchanged. */
export function withBodyType<T extends ShapeParams>(params: T, choice: BodyTypeChoice | undefined): T {
  if (!choice || choice.id === "average" || choice.intensity <= 0) return params;
  const spec = BODY_TYPES[choice.id];
  const t = clamp01(choice.intensity);
  const female = 1 - clamp01(params.gender);
  const share = t * (female + (1 - female) * (spec.maleScale ?? 1));
  const modifiers: Record<string, number> = { ...(params.modifiers ?? {}) };
  const add = (offsets: Offsets, factor: number) => {
    if (factor <= 0) return;
    for (const [id, offset] of Object.entries(offsets)) modifiers[id] = (modifiers[id] ?? 0) + offset * factor;
  };
  add(spec.modifiers, share);
  add(spec.female ?? {}, t * female);
  return {
    ...params,
    muscle: clamp01(params.muscle + (spec.muscle ?? 0) * share),
    proportions: clamp01(params.proportions + (spec.proportions ?? 0) * share),
    cupSize: clamp01((params.cupSize ?? 0.5) + (spec.cup ?? 0) * t * female),
    modifiers,
  };
}

/**
 * Switches type (or intensity) and keeps the typed height and weight: the new body is re-solved for
 * `keep`. Out-of-range values are clamped and reported by the solver result.
 */
export function switchBodyType(params: ShapeParams, choice: BodyTypeChoice, keep: BodySize, measure: MeasureSize): SolveResult {
  return solveBody({ ...params, bodyType: choice }, keep, measure);
}
