/**
 * @file head-regions.ts
 * @description Head tab data (plan 2.6): every head modifier of the catalogue as a region control,
 *   grouped head shape, forehead, eyebrows, eyes, nose, cheeks, mouth, chin, ears, neck, with
 *   readable labels and end words (MakeHuman labels repeat, e.g. three "Trans" per group). Sided
 *   modifiers move both sides together (symmetric). Face-shape presets set one unipolar head shape.
 * @scope cinelab-studio
 * @depends ./modifier-catalogue, ./body-regions, ./shape-model (types)
 */

import type { BodyRegion, RegionControl } from "./body-regions";
import { HEAD_GROUPS, type Modifier } from "./modifier-catalogue";
import type { ShapeParams } from "./shape-model";

const GROUP_LABELS: Record<string, string> = {
  head: "Head shape", forehead: "Forehead", eyebrows: "Eyebrows", eyes: "Eyes", nose: "Nose",
  cheek: "Cheeks", mouth: "Mouth", chin: "Chin", ears: "Ears", neck: "Neck",
};
const PREFIXES = ["head-", "forehead-", "eyebrows-", "eye-", "nose-", "cheek-", "mouth-", "chin-", "ear-", "measure-neck-", "neck-"];
const TRANS: Record<string, string> = { "down-up": "Vertical position", "in-out": "Horizontal position", "backward-forward": "Depth position" };
const SCALE: Record<string, string> = { vert: "Height", horiz: "Width", depth: "Depth" };
const WORDS: Record<string, string> = { lowerlip: "lower lip", upperlip: "upper lip", cupidsbow: "Cupid's bow", septumangle: "septum angle", eyefold: "eyefold", ext: "corners", rot: "rotation", circ: "thickness", prognathism: "jaw projection", invertedtriangular: "heart", rectangular: "long" };
/** Names whose generated label would be vague or repeated. */
const OVERRIDES: Record<string, string> = {
  "head-angle-in-out": "Tilt", "head-fat-decr-incr": "Fullness", "head-age-decr-incr": "Age look",
  "head-back-scale-depth-decr-incr": "Back of head depth", "forehead-nubian-decr-incr": "Nubian slope",
  "eye-bag-decr-incr": "Bag size", "eye-bag-in-out": "Bag depth", "eye-eyefold-down-up": "Eyefold height",
  "eye-eyefold-concave-convex": "Eyefold curve", "eye-corner1-down-up": "Inner corner", "eye-corner2-down-up": "Outer corner",
  "eye-push1-in-out": "Upper lid depth", "eye-push2-in-out": "Lower lid depth", "nose-greek-decr-incr": "Greek profile",
  "nose-point-down-up": "Tip height", "nose-base-down-up": "Base height", "cheek-bones-decr-incr": "Cheekbones",
  "cheek-inner-decr-incr": "Inner volume", "chin-prominent-decr-incr": "Prominence", "chin-bones-decr-incr": "Jaw bones",
  "ear-shape-square-round": "Roundness", "ear-shape-pointed-triangle": "Pointed tip", "neck-double-decr-incr": "Double chin",
  "neck-back-scale-depth-decr-incr": "Back of neck depth",
};
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Readable label from the category name, e.g. `nose-trans-down-up` -> "Vertical position". */
export function headControlLabel(modifier: Modifier): string {
  const name = modifier.id.split("/")[1];
  if (OVERRIDES[name]) return OVERRIDES[name];
  const prefix = PREFIXES.find((p) => name.startsWith(p)) ?? "";
  let core = name.slice(prefix.length);
  if (modifier.ends) core = core.slice(0, -(modifier.ends.join("-").length + 1));
  if (core === "trans" && modifier.ends) return TRANS[modifier.ends.join("-")] ?? "Position";
  if (core.startsWith("scale")) return [SCALE[core.split("-")[1]] ?? "Size", ...core.split("-").slice(2)].join(" ");
  if (modifier.kind === "unipolar") return `${capital(WORDS[core] ?? core)} shape`;
  const words = core.split("-").map((w) => WORDS[w] ?? w.replace(/(\d)$/, " $1"));
  const label = capital(words.join(" "));
  return modifier.group === "neck" && name.startsWith("measure-neck-") ? `Neck ${label.toLowerCase()}` : label;
}

/** Head regions in HEAD_GROUPS order; labels are made unique within a group by their end words. */
export function headRegions(catalogue: readonly Modifier[]): BodyRegion[] {
  return HEAD_GROUPS.map((group) => {
    const modifiers = catalogue.filter((m) => m.group === group);
    const labels = modifiers.map(headControlLabel);
    const controls = modifiers.map((m, i): RegionControl => {
      const repeated = labels.filter((l) => l === labels[i]).length > 1;
      const label = repeated && m.ends ? `${labels[i]} (${m.ends.join("/")})` : labels[i];
      return { kind: "modifier", id: m.id, label, unipolar: m.kind === "unipolar", ends: m.ends ?? undefined };
    });
    return { id: `head-${group}`, label: GROUP_LABELS[group] ?? capital(group), controls };
  }).filter((region) => region.controls.length > 0);
}

export const FACE_SHAPE_IDS = ["oval", "round", "square", "heart", "long", "diamond", "triangular"] as const;
export type FaceShapeId = (typeof FACE_SHAPE_IDS)[number];
const FACE_SHAPE_TARGET: Record<FaceShapeId, string> = {
  oval: "head/head-oval", round: "head/head-round", square: "head/head-square", heart: "head/head-invertedtriangular",
  long: "head/head-rectangular", diamond: "head/head-diamond", triangular: "head/head-triangular",
};
/** Strength of a face-shape preset; the slider can take it further. */
export const FACE_SHAPE_STRENGTH = 0.7;

/** Sets one face shape (the other unipolar head shapes back to 0), or clears them with null. */
export function applyFaceShape<T extends ShapeParams>(shape: T, id: FaceShapeId | null): T {
  const modifiers = { ...(shape.modifiers ?? {}) };
  for (const target of Object.values(FACE_SHAPE_TARGET)) delete modifiers[target];
  if (id) modifiers[FACE_SHAPE_TARGET[id]] = FACE_SHAPE_STRENGTH;
  return { ...shape, modifiers };
}

/** The face shape with the largest value, or null. */
export function currentFaceShape(shape: ShapeParams): FaceShapeId | null {
  let best: FaceShapeId | null = null;
  for (const id of FACE_SHAPE_IDS) {
    const value = shape.modifiers?.[FACE_SHAPE_TARGET[id]] ?? 0;
    if (value > 0 && (!best || value > (shape.modifiers?.[FACE_SHAPE_TARGET[best]] ?? 0))) best = id;
  }
  return best;
}
