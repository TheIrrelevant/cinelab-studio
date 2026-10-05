/**
 * @file limbs.ts
 * @description The four IK limbs of the MakeHuman rig: upper bone (rotates at the shoulder or
 *   hip), lower bone (elbow or knee hinge around its local X), end effector (wrist or foot), and
 *   the world direction the middle joint bends towards when the limb is straight.
 * @scope cinelab-studio
 * @depends none
 */

export type LimbId = "arm.L" | "arm.R" | "leg.L" | "leg.R";

export type Limb = {
  id: LimbId;
  upper: string;
  lower: string;
  end: string;
  /** Fallback bend direction (world, Y-up, +Z front) for a straight limb. */
  bend: readonly [number, number, number];
};

export const LIMBS: Record<LimbId, Limb> = {
  "arm.L": { id: "arm.L", upper: "upperarm01.L", lower: "lowerarm01.L", end: "wrist.L", bend: [0, -0.3, -1] },
  "arm.R": { id: "arm.R", upper: "upperarm01.R", lower: "lowerarm01.R", end: "wrist.R", bend: [0, -0.3, -1] },
  "leg.L": { id: "leg.L", upper: "upperleg01.L", lower: "lowerleg01.L", end: "foot.L", bend: [0, 0, 1] },
  "leg.R": { id: "leg.R", upper: "upperleg01.R", lower: "lowerleg01.R", end: "foot.R", bend: [0, 0, 1] },
};

export const LIMB_IDS = Object.keys(LIMBS) as LimbId[];

/** The limb whose end effector is `bone` (e.g. `wrist.L` -> `arm.L`). */
export function limbOfEffector(bone: string): LimbId | null {
  return LIMB_IDS.find((id) => LIMBS[id].end === bone) ?? null;
}

/** Bones whose rotation an IK solve writes for the limb. */
export const limbBones = (id: LimbId) => [LIMBS[id].upper, LIMBS[id].lower, LIMBS[id].end];
