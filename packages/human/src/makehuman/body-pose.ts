/**
 * @file body-pose.ts
 * @description Applies a pose (bone name -> rotation delta on the rest frame) to a MakeHuman
 *   skeleton, clamped to the joint limits; bones missing from the pose return to rest; the root
 *   can be offset from its rest position. Also a
 *   limit demo pose that bends the main joints towards their limit ends for visual checks.
 * @scope cinelab-studio
 * @depends three, ./bone-frames, ./joint-limits, ./swing-twist, ./morph-manifest
 */

import { Quaternion, Vector3, type Skeleton } from "three";
import { setBonePoseDelta } from "./bone-frames";
import { clampBoneDelta, jointLimit } from "./joint-limits";
import type { MorphManifest } from "./morph-manifest";
import { fromSwingTwist } from "./swing-twist";

/** Rig bone name (e.g. `lowerarm01.L`) -> rotation delta on top of the rest frame. */
export type BodyPose = Record<string, Quaternion>;

/** Also moves the root bone by `rootOffset` (metres, parent space) from its rest position. */
export function applyBodyPose(skeleton: Skeleton, bones: MorphManifest["bones"], pose: BodyPose, rootOffset: readonly number[] = [0, 0, 0]): void {
  bones.forEach((spec, i) => {
    const bone = skeleton.bones[i];
    const delta = pose[spec.name];
    setBonePoseDelta(bone, delta ? clampBoneDelta(spec.name, delta) : new Quaternion());
    if (spec.parent < 0) bone.position.copy(restPosition(bone).add(new Vector3(rootOffset[0], rootOffset[1], rootOffset[2])));
  });
}

/** Rest position stored by the skeleton refit (current position before the first refit). */
export function restPosition(bone: Skeleton["bones"][number]): Vector3 {
  return ((bone.userData.restPosition as Vector3 | undefined) ?? bone.position).clone();
}

const DEG = Math.PI / 180;

/** Pose at `fraction` of one limit end; `end` 0 = min, 1 = max. */
function towards(name: string, axis: "x" | "z", end: 0 | 1, fraction: number): Quaternion {
  const degrees = (jointLimit(name)?.limit[axis][end] ?? 0) * fraction * DEG;
  return fromSwingTwist({ swingX: axis === "x" ? degrees : 0, swingZ: axis === "z" ? degrees : 0, twist: 0 });
}

/** Left arm raised sideways, both elbows flexed, right hip flexed with knee bent, fists, head turned. */
export function limitDemoPose(): BodyPose {
  const pose: BodyPose = {
    "upperarm01.L": towards("upperarm01.L", "z", 1, 0.8),
    "lowerarm01.L": towards("lowerarm01.L", "x", 1, 0.8),
    "upperarm01.R": towards("upperarm01.R", "x", 1, 0.35),
    "lowerarm01.R": towards("lowerarm01.R", "x", 1, 1),
    "upperleg01.R": towards("upperleg01.R", "x", 0, 0.6),
    "lowerleg01.R": towards("lowerleg01.R", "x", 1, 0.6),
    "foot.R": towards("foot.R", "x", 1, 0.6),
    neck02: fromSwingTwist({ swingX: 0, swingZ: 0, twist: 25 * DEG }),
    spine02: towards("spine02", "x", 1, 1),
  };
  for (const side of ["L", "R"]) {
    for (let f = 2; f <= 5; f += 1) for (let j = 1; j <= 3; j += 1) pose[`finger${f}-${j}.${side}`] = towards(`finger${f}-${j}.${side}`, "x", 1, 0.9);
  }
  return pose;
}
