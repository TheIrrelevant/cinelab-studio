/**
 * @file swing-twist.ts
 * @description Splits a bone-local rotation into twist (around local Y, the bone axis) and swing
 *   (moving the bone axis, as a rotation vector in the local X/Z plane), and rebuilds it. Joint
 *   limits clamp these three angles; unlike Euler angles they have no gimbal range limit, so a
 *   shoulder can swing past 90 degrees on two axes. q = swing * twist.
 * @scope cinelab-studio
 * @depends three
 */

import { Quaternion, Vector3 } from "three";

/** Angles in radians: swing rotation vector (x, z) and twist around Y. */
export type SwingTwist = { swingX: number; swingZ: number; twist: number };

const Y = new Vector3(0, 1, 0);

export function toSwingTwist(q: Quaternion): SwingTwist {
  const n = q.clone().normalize();
  if (n.w < 0) n.set(-n.x, -n.y, -n.z, -n.w);
  const twistLength = Math.hypot(n.w, n.y);
  // Swing of 180 degrees: the twist is undefined, take none.
  const twist = twistLength < 1e-9 ? new Quaternion() : new Quaternion(0, n.y / twistLength, 0, n.w / twistLength);
  const swing = n.clone().multiply(twist.clone().invert());
  if (swing.w < 0) swing.set(-swing.x, -swing.y, -swing.z, -swing.w);
  const sinHalf = Math.hypot(swing.x, swing.z);
  const angle = 2 * Math.atan2(sinHalf, swing.w);
  const scale = sinHalf < 1e-12 ? 2 : angle / sinHalf;
  return {
    swingX: swing.x * scale,
    swingZ: swing.z * scale,
    twist: wrap(2 * Math.atan2(twist.y, twist.w)),
  };
}

export function fromSwingTwist({ swingX, swingZ, twist }: SwingTwist, out = new Quaternion()): Quaternion {
  const angle = Math.hypot(swingX, swingZ);
  const swing = angle < 1e-12 ? new Quaternion() : new Quaternion().setFromAxisAngle(new Vector3(swingX / angle, 0, swingZ / angle), angle);
  return out.copy(swing.multiply(new Quaternion().setFromAxisAngle(Y, twist)));
}

function wrap(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
