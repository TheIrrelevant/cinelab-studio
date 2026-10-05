/**
 * @file bone-frames.ts
 * @description Bone rest frames from head, tail and roll, as Blender defines them: local Y points
 *   from head to tail and roll turns the frame around it. MakeHuman rolls are authored in
 *   Blender (Z-up), so the frame is built in Blender axes and then expressed in our Y-up axes.
 *   Adapted from Anny (Apache 2.0, NAVER Corp.) `utils/kinematics.py` get_bone_poses and
 *   Blender's vec_roll_to_mat3_normalized; see NOTICE and docs/anny-notes.md section 5.
 * @scope cinelab-studio
 * @depends three
 */

import { Matrix4, Quaternion, Vector3, type Object3D } from "three";

type Vec3 = readonly [number, number, number];

/** Our Y-up (x, y, z) in Blender Z-up axes. */
const toBlender = (v: Vec3): Vec3 => [v[0], -v[2], v[1]];

const SAFE_THRESHOLD = 6.1e-3;
const CRITICAL_THRESHOLD_SQUARED = 2.5e-4 * 2.5e-4;

/**
 * Column-major 3x3 basis (x, y, z columns) for a unit bone direction and roll in Blender axes.
 * The y column equals `dir`.
 */
export function blenderBoneBasis(dir: Vec3, roll: number): number[] {
  const [x, y, z] = dir;
  let theta = 1 + y;
  const thetaAlt = x * x + z * z;
  // b[col][row], as in Blender.
  let b: number[][];
  if (theta > SAFE_THRESHOLD || thetaAlt > CRITICAL_THRESHOLD_SQUARED) {
    if (theta <= SAFE_THRESHOLD) theta = thetaAlt * 0.5 + thetaAlt * thetaAlt * 0.125;
    b = [
      [1 - (x * x) / theta, -x, (-x * z) / theta],
      [x, y, z],
      [(-x * z) / theta, -z, 1 - (z * z) / theta],
    ];
  } else {
    b = [
      [-1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ];
  }
  // Roll turns the basis around the bone axis: r = axisAngle(dir, roll) * b.
  const axis = new Vector3(x, y, z);
  return b.flatMap((column) => new Vector3(...column).applyAxisAngle(axis, roll).toArray());
}

/** World rest rotation of a bone in our Y-up axes; local Y points from head to tail. */
export function boneRestQuaternion(head: Vec3, tail: Vec3, roll: number, out = new Quaternion()): Quaternion {
  const d = new Vector3(tail[0] - head[0], tail[1] - head[1], tail[2] - head[2]);
  const length = d.length();
  if (length < 1e-9) return out.identity();
  d.divideScalar(length);
  const basis = blenderBoneBasis(toBlender([d.x, d.y, d.z]), roll);
  // Blender world (x, y, z) -> ours (x, z, -y), applied to each basis column.
  const column = (c: number) => [basis[c * 3], basis[c * 3 + 2], -basis[c * 3 + 1]];
  const [bx, by, bz] = [column(0), column(1), column(2)];
  const m = new Matrix4().set(
    bx[0], by[0], bz[0], 0,
    bx[1], by[1], bz[1], 0,
    bx[2], by[2], bz[2], 0,
    0, 0, 0, 1,
  );
  return out.setFromRotationMatrix(m);
}

/** Local rest rotation stored by the skeleton refit (identity before the first refit). */
export function restQuaternion(bone: Object3D): Quaternion {
  return (bone.userData.restQuaternion as Quaternion | undefined)?.clone() ?? new Quaternion();
}

/** Pose rotation on top of the rest frame: local = rest * delta. */
export function bonePoseDelta(bone: Object3D): Quaternion {
  return restQuaternion(bone).invert().multiply(bone.quaternion);
}

export function setBonePoseDelta(bone: Object3D, delta: Quaternion): void {
  bone.quaternion.copy(restQuaternion(bone).multiply(delta));
}
