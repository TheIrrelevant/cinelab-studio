/**
 * @file mannequin-spec.ts
 * @description Proportions and colours that drive the placeholder 3D human figure.
 * @scope cinelab-studio
 * @depends none
 */

export type HairShape = "none" | "cap" | "bob" | "long" | "bun" | "curly";

export type MannequinSpec = {
  /** Standing height in metres. */
  height: number;
  /** Horizontal scale for torso, hips and limbs. */
  girth: number;
  /** Shoulder width relative to hips. */
  shoulderRatio: number;
  skin: string;
  hairColor: string;
  hair: HairShape;
};
