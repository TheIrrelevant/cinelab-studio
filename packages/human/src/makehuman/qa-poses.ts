/**
 * @file qa-poses.ts
 * @description Fixed deformation QA pose set (plan 1.6): arms up, elbows at 140 degrees, deep
 *   squat, fists, head turned, jaw open. Values are degrees in joint-limit space (swing X, twist
 *   Y, swing Z) for the left side; right bones are mirrored (Y and Z negated). All stay inside the
 *   joint limits.
 * @scope cinelab-studio
 * @depends ./body-pose, ./swing-twist
 */

import type { BodyPose } from "./body-pose";
import { fromSwingTwist } from "./swing-twist";

export type QaPoseId = "arms-up" | "elbows-140" | "deep-squat" | "fists" | "head-turn" | "jaw-open";
type Degrees = readonly [x: number, y: number, z: number];
export type QaPose = { id: QaPoseId; label: string; pose: BodyPose; rootOffset: readonly [number, number, number] };

const DEG = Math.PI / 180;
const q = ([x, y, z]: Degrees) => fromSwingTwist({ swingX: x * DEG, twist: y * DEG, swingZ: z * DEG });

/** Centre bones as given, `.L`/`.R` pairs mirrored from the left values. */
function build(left: Record<string, Degrees>, centre: Record<string, Degrees> = {}): BodyPose {
  const pose: BodyPose = {};
  for (const [bone, d] of Object.entries(centre)) pose[bone] = q(d);
  for (const [bone, [x, y, z]] of Object.entries(left)) {
    pose[`${bone}.L`] = q([x, y, z]);
    pose[`${bone}.R`] = q([x, -y, -z]);
  }
  return pose;
}

const fingers = (): Record<string, Degrees> => {
  const out: Record<string, Degrees> = { "finger1-1": [0, 0, -30], "finger1-2": [0, 0, -50], "finger1-3": [0, 0, -70] };
  for (let f = 2; f <= 5; f += 1) Object.assign(out, { [`finger${f}-1`]: [85, 0, 0], [`finger${f}-2`]: [95, 0, 0], [`finger${f}-3`]: [75, 0, 0] });
  return out;
};

export const QA_POSES: QaPose[] = [
  { id: "arms-up", label: "Arms up", rootOffset: [0, 0, 0], pose: build({ clavicle: [0, 0, 20], upperarm01: [0, 0, 125] }) },
  { id: "elbows-140", label: "Elbows 140", rootOffset: [0, 0, 0], pose: build({ upperarm01: [40, 0, -20], lowerarm01: [100, 0, 0] }) },
  {
    id: "deep-squat",
    label: "Deep squat",
    rootOffset: [0, -0.42, -0.08],
    pose: build({ upperleg01: [-105, 0, -12], lowerleg01: [135, 0, 0], foot: [-30, 0, 0], upperarm01: [60, 0, -30] }, { spine05: [12, 0, 0], spine04: [12, 0, 0], spine03: [8, 0, 0] }),
  },
  { id: "fists", label: "Fists", rootOffset: [0, 0, 0], pose: build(fingers()) },
  { id: "head-turn", label: "Head turn", rootOffset: [0, 0, 0], pose: build({}, { neck01: [0, 25, 0], neck02: [0, 25, 0], neck03: [0, 25, 0], head: [0, 15, 0] }) },
  { id: "jaw-open", label: "Jaw open", rootOffset: [0, 0, 0], pose: build({}, { jaw: [25, 0, 0] }) },
];
