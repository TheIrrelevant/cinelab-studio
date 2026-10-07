/**
 * @file eye-look.ts
 * @description Eye look as pose deltas for the `eye.L` / `eye.R` bones (plan 3.1). Angles are given
 *   in the character's rest-pose axes (yaw about world up, pitch about world X) and converted to each
 *   eye bone's local frame, so the eyes turn relative to the head whatever the bone roll is.
 * @scope cinelab-studio
 * @depends three, ./body-pose, ./face-units
 */

import { Quaternion, Vector3, type Bone, type Object3D, type Skeleton } from "three";
import type { BodyPose } from "./body-pose";
import type { EyeAngles } from "./face-units";

const DEG = Math.PI / 180;
const UP = new Vector3(0, 1, 0);
const SIDE = new Vector3(1, 0, 0);

/** World orientation of `bone` with every bone at its rest frame. */
function restWorld(bone: Object3D): Quaternion {
  const rest = bone.userData.restQuaternion as Quaternion | undefined;
  if (!(bone as Bone).isBone || !rest) return bone.getWorldQuaternion(new Quaternion());
  const parent = bone.parent ? restWorld(bone.parent) : new Quaternion();
  return parent.multiply(rest);
}

/** Local delta of `bone` that rotates it by `yaw` and `pitch` degrees in rest-pose world axes. */
export function worldTurnDelta(bone: Bone, yaw: number, pitch: number): Quaternion {
  // Looking up lifts the forward axis (+z), which is a negative turn about +x.
  const turn = new Quaternion().setFromAxisAngle(UP, yaw * DEG).multiply(new Quaternion().setFromAxisAngle(SIDE, -pitch * DEG));
  const world = restWorld(bone);
  return world.clone().invert().multiply(turn).multiply(world);
}

/** Pose deltas for both eyes; eyes at zero angle are left out (rest). */
export function eyeLookPose(skeleton: Skeleton, boneNames: readonly string[], angles: EyeAngles): BodyPose {
  const pose: BodyPose = {};
  for (const [name, angle] of [["eye.L", angles.left], ["eye.R", angles.right]] as const) {
    const bone = skeleton.bones[boneNames.indexOf(name)];
    if (bone && (angle.yaw !== 0 || angle.pitch !== 0)) pose[name] = worldTurnDelta(bone, angle.yaw, angle.pitch);
  }
  return pose;
}
