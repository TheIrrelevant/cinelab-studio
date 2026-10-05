/**
 * @file pose-numeric.ts
 * @description Numeric X/Y/Z values of a bone pose delta in degrees, in the same space as the
 *   joint limits: X and Z are the swing vector components, Y is the twist around the bone.
 * @scope cinelab-studio
 * @depends three, ./swing-twist
 */

import type { Quaternion } from "three";
import { fromSwingTwist, toSwingTwist } from "./swing-twist";

export type PoseDegrees = { x: number; y: number; z: number };

const DEG = Math.PI / 180;

export function deltaToDegrees(delta: Quaternion): PoseDegrees {
  const { swingX, swingZ, twist } = toSwingTwist(delta);
  return { x: swingX / DEG, y: twist / DEG, z: swingZ / DEG };
}

export function degreesToDelta({ x, y, z }: PoseDegrees): Quaternion {
  return fromSwingTwist({ swingX: x * DEG, swingZ: z * DEG, twist: y * DEG });
}
