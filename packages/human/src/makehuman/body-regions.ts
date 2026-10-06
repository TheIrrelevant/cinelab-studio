/**
 * @file body-regions.ts
 * @description Body region sliders (plan 2.5, decision D4): chest, shoulders and torso, waist and
 *   hips, stomach, arms, legs, neck. A control is either a shape parameter (breast cup and firmness,
 *   0..1) or a local modifier (bipolar -1..1 or unipolar 0..1, 0 = neutral; head regions in
 *   head-regions.ts use the same shape). Region values add to the body type's
 *   offsets (see body-types.ts). Reading and writing go through `regionValue` / `withRegionValue`.
 * @scope cinelab-studio
 * @depends ./shape-model (types)
 */

import type { ShapeParams } from "./shape-model";

export type RegionControl =
  | { kind: "param"; key: "cupSize" | "firmness"; label: string; femaleOnly?: boolean }
  | { kind: "modifier"; id: string; label: string; femaleOnly?: boolean; unipolar?: boolean; ends?: readonly [string, string] };

export type BodyRegion = { id: string; label: string; controls: RegionControl[] };

const mod = (id: string, label: string, femaleOnly = false): RegionControl => ({ kind: "modifier", id, label, femaleOnly });

export const BODY_REGIONS: readonly BodyRegion[] = [
  {
    id: "chest",
    label: "Chest",
    controls: [
      { kind: "param", key: "cupSize", label: "Breast size", femaleOnly: true },
      { kind: "param", key: "firmness", label: "Breast firmness", femaleOnly: true },
      mod("breast/breast-volume-vert-down-up", "Upper volume", true),
      mod("breast/breast-trans-down-up", "Breast height", true),
    ],
  },
  {
    id: "torso",
    label: "Shoulders and torso",
    controls: [
      mod("torso/measure-shoulder-dist-decr-incr", "Shoulder width"),
      mod("torso/torso-vshape-decr-incr", "V-shape"),
      mod("torso/torso-muscle-pectoral-decr-incr", "Chest muscle"),
      mod("torso/measure-bust-circ-decr-incr", "Chest girth"),
    ],
  },
  {
    id: "waist",
    label: "Waist and hips",
    controls: [
      mod("torso/measure-waist-circ-decr-incr", "Waist"),
      mod("torso/measure-hips-circ-decr-incr", "Hip girth"),
      mod("hip/hip-scale-horiz-decr-incr", "Hip width"),
      mod("buttocks/buttocks-volume-decr-incr", "Buttocks"),
    ],
  },
  {
    id: "stomach",
    label: "Stomach",
    controls: [mod("stomach/stomach-pregnant-decr-incr", "Belly"), mod("stomach/stomach-tone-decr-incr", "Stomach tone")],
  },
  {
    id: "arms",
    label: "Arms",
    controls: [
      mod("arms/upperarm-fat-decr-incr", "Upper arm fat"),
      mod("arms/upperarm-muscle-decr-incr", "Upper arm muscle"),
      mod("arms/lowerarm-fat-decr-incr", "Forearm fat"),
    ],
  },
  {
    id: "legs",
    label: "Legs",
    controls: [
      mod("legs/measure-thigh-circ-decr-incr", "Thigh girth"),
      mod("legs/upperleg-fat-decr-incr", "Thigh fat"),
      mod("legs/upperleg-muscle-decr-incr", "Thigh muscle"),
      mod("legs/measure-calf-circ-decr-incr", "Calf girth"),
    ],
  },
  {
    id: "neck",
    label: "Neck",
    controls: [mod("neck/measure-neck-circ-decr-incr", "Neck thickness"), mod("neck/neck-double-decr-incr", "Double chin")],
  },
];

/** Neutral value of a control: 0.5 for shape parameters, 0 for modifiers. */
export const regionNeutral = (control: RegionControl) => (control.kind === "param" ? 0.5 : 0);

export function regionValue(shape: ShapeParams, control: RegionControl): number {
  if (control.kind === "param") return shape[control.key] ?? 0.5;
  return shape.modifiers?.[control.id] ?? 0;
}

export function withRegionValue<T extends ShapeParams>(shape: T, control: RegionControl, value: number): T {
  if (control.kind === "param") return { ...shape, [control.key]: Math.min(1, Math.max(0, value)) };
  const modifiers = { ...(shape.modifiers ?? {}) };
  const v = Math.min(1, Math.max(control.unipolar ? 0 : -1, value));
  if (v === 0) delete modifiers[control.id];
  else modifiers[control.id] = v;
  return { ...shape, modifiers };
}

/** All controls of a region back to neutral. */
export function resetRegion<T extends ShapeParams>(shape: T, region: BodyRegion): T {
  return region.controls.reduce((next, control) => withRegionValue(next, control, regionNeutral(control)), shape);
}
