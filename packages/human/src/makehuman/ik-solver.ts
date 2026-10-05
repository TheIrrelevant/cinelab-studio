/**
 * @file ik-solver.ts
 * @description Analytic two-bone IK for a MakeHuman limb on a posed skeleton, exact for the real
 *   hinge. (1) The elbow/knee flexes around its actual hinge axis (lower bone local X, through the
 *   joint) until the shoulder/hip-to-effector distance equals the target distance: A cos t + B sin t
 *   = C, two roots. (2) The whole limb turns around the shoulder/hip onto the target by the
 *   shortest arc, then around the shoulder-target axis so the middle joint faces the pole, if one
 *   is given. (3) The end effector keeps its world orientation (feet stay flat). Of the two roots
 *   the one the joint limits distort least wins. Results are clamped pose deltas; world space
 *   (the body scene sits at the origin).
 * @scope cinelab-studio
 * @depends three, ./bone-frames, ./joint-limits, ./limbs, ./swing-twist
 */

import { Quaternion, Vector3, type Bone } from "three";
import { bonePoseDelta, restQuaternion } from "./bone-frames";
import { clampBoneDelta, jointLimit } from "./joint-limits";
import type { Limb } from "./limbs";
import { toSwingTwist } from "./swing-twist";

const DEG = Math.PI / 180;
const worldQuaternion = (bone: Bone) => bone.getWorldQuaternion(new Quaternion());
const worldPosition = (bone: Bone) => bone.getWorldPosition(new Vector3());
const parentQuaternion = (bone: Bone) => (bone.parent ? bone.parent.getWorldQuaternion(new Quaternion()) : new Quaternion());
const perpendicular = (v: Vector3, axis: Vector3) => v.clone().sub(axis.clone().multiplyScalar(v.dot(axis)));
const deltaFor = (bone: Bone, parent: Quaternion, world: Quaternion) =>
  restQuaternion(bone).invert().multiply(parent.clone().invert().multiply(world));
const signedAngle = (from: Vector3, to: Vector3, axis: Vector3) =>
  Math.atan2(new Vector3().crossVectors(from, to).dot(axis), from.dot(to));

/** Flex angles t (around `hinge` through `e`) that put `w` at distance `d` from `s`. */
function flexRoots(s: Vector3, e: Vector3, w: Vector3, hinge: Vector3, d: number): number[] {
  const arm = w.clone().sub(e);
  const along = hinge.clone().multiplyScalar(arm.dot(hinge));
  const radial = arm.clone().sub(along);
  const side = new Vector3().crossVectors(hinge, radial);
  const base = e.clone().sub(s).add(along);
  // |base + cos t radial + sin t side|^2 = d^2
  const A = 2 * base.dot(radial);
  const B = 2 * base.dot(side);
  const C = d * d - base.lengthSq() - radial.lengthSq();
  const R = Math.hypot(A, B);
  const phase = Math.atan2(B, A);
  const spread = Math.acos(Math.max(-1, Math.min(1, R > 1e-12 ? C / R : 1)));
  return [phase + spread, phase - spread];
}

/** Rotation taking unit vector a onto unit vector b by the shortest arc. */
const arc = (a: Vector3, b: Vector3) => new Quaternion().setFromUnitVectors(a, b);

/**
 * Pose deltas (upper, lower, end) that bring the limb's end effector to `target`, optionally
 * with the middle joint facing `pole`. World matrices are updated here.
 */
export function solveTwoBone(bones: Map<string, Bone>, limb: Limb, target: Vector3, pole?: Vector3): Record<string, Quaternion> {
  const upper = bones.get(limb.upper)!;
  const lower = bones.get(limb.lower)!;
  const end = bones.get(limb.end)!;
  upper.updateWorldMatrix(true, true);
  const [s, e, w] = [worldPosition(upper), worldPosition(lower), worldPosition(end)];
  const hinge = new Vector3().setFromMatrixColumn(lower.matrixWorld, 0).normalize();
  const a = e.distanceTo(s);
  const b = w.distanceTo(e);
  const d = Math.min(a + b, Math.max(Math.abs(a - b), target.distanceTo(s)));
  const flexNow = toSwingTwist(bonePoseDelta(lower)).swingX;
  const [minX, maxX] = jointLimit(limb.lower)!.limit.x;
  const toTarget = target.clone().sub(s).normalize();
  const [upperWorld, upperParent, lowerWorld, endWorld] = [worldQuaternion(upper), parentQuaternion(upper), worldQuaternion(lower), worldQuaternion(end)];
  const lowerParent = parentQuaternion(lower);
  const endParent = parentQuaternion(end);

  const candidate = (root: number) => {
    // Keep the flex inside the limit range, whichever root it came from.
    const wrapped = Math.atan2(Math.sin(root), Math.cos(root));
    const t = Math.max(minX * DEG - flexNow, Math.min(maxX * DEG - flexNow, wrapped));
    const flex = new Quaternion().setFromAxisAngle(hinge, t);
    const w1 = w.clone().sub(e).applyQuaternion(flex).add(e);
    let turn = arc(w1.clone().sub(s).normalize(), toTarget);
    const elbowSide = perpendicular(e.clone().sub(s).applyQuaternion(turn), toTarget);
    const poleSide = pole ? perpendicular(pole.clone().sub(s), toTarget) : null;
    if (poleSide && poleSide.length() > 0.05 * a && elbowSide.length() > 1e-4) {
      turn = new Quaternion().setFromAxisAngle(toTarget, signedAngle(elbowSide.normalize(), poleSide.normalize(), toTarget)).multiply(turn);
    }
    const lowerTurn = turn.clone().multiply(flex);
    const raw = {
      upper: deltaFor(upper, upperParent, turn.clone().multiply(upperWorld)),
      lower: deltaFor(lower, turn.clone().multiply(lowerParent), lowerTurn.clone().multiply(lowerWorld)),
      end: deltaFor(end, lowerTurn.clone().multiply(endParent), endWorld),
    };
    const deltas = {
      [limb.upper]: clampBoneDelta(limb.upper, raw.upper),
      [limb.lower]: clampBoneDelta(limb.lower, raw.lower),
      [limb.end]: clampBoneDelta(limb.end, raw.end),
    };
    const distortion = Math.abs(t - wrapped) + deltas[limb.upper].angleTo(raw.upper) + deltas[limb.lower].angleTo(raw.lower);
    return { deltas, distortion };
  };
  const [first, second] = flexRoots(s, e, w, hinge, d).map(candidate);
  return (second.distortion < first.distortion - 1e-6 ? second : first).deltas;
}
