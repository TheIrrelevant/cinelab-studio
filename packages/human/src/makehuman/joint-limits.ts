/**
 * @file joint-limits.ts
 * @description Anatomical rotation limits for every posable bone of the MakeHuman default rig, as
 *   data plus a clamp. Limits are degrees on the bone's local axes relative to its rest frame:
 *   swing around X, swing around Z, twist around Y (the bone axis). Values are written for the
 *   left side; right bones mirror them (X kept, Y and Z negated). Facial and tongue bones are
 *   driven by expressions and are not posable here.
 *   Signs on the left side (measured on the rest frames): spine/neck/head +X bends forward;
 *   upper arm +X raises forward, +Z abducts; elbow, knee, finger and toe +X flex; hip -X flexes,
 *   -Z abducts; foot +X points the toes down; thumb flexes around -Z.
 * @scope cinelab-studio
 * @depends three, ./swing-twist
 */

import type { Quaternion } from "three";
import { fromSwingTwist, toSwingTwist } from "./swing-twist";

export type Range = readonly [min: number, max: number];
export type JointLimit = { x: Range; y: Range; z: Range };
export type JointGroup = "root" | "spine" | "neck" | "head" | "jaw" | "eye" | "shoulder" | "arm" | "elbow"
  | "wrist" | "hand" | "thumb" | "finger" | "hip" | "knee" | "ankle" | "toe";

const L = (group: JointGroup, x: Range, y: Range, z: Range) => ({ group, limit: { x, y, z } });
const FREE: Range = [-180, 180];
const NONE: Range = [0, 0];

/** Left-side and centre limits in degrees, keyed by rig bone name without side suffix. */
const TABLE: Record<string, { group: JointGroup; limit: JointLimit }> = {
  root: L("root", FREE, FREE, FREE),
  spine05: L("spine", [-8, 15], [-8, 8], [-8, 8]),
  spine04: L("spine", [-8, 15], [-8, 8], [-8, 8]),
  spine03: L("spine", [-8, 15], [-10, 10], [-8, 8]),
  spine02: L("spine", [-8, 15], [-10, 10], [-8, 8]),
  spine01: L("spine", [-6, 12], [-10, 10], [-6, 6]),
  neck01: L("neck", [-20, 17], [-27, 27], [-15, 15]),
  neck02: L("neck", [-20, 17], [-27, 27], [-15, 15]),
  neck03: L("neck", [-20, 17], [-27, 27], [-15, 15]),
  head: L("head", [-25, 20], [-15, 15], [-15, 15]),
  jaw: L("jaw", [-2, 25], [-3, 3], [-6, 6]),
  eye: L("eye", [-30, 30], NONE, [-35, 35]),
  breast: L("shoulder", [-5, 5], NONE, [-5, 5]),
  pelvis: L("hip", [-5, 5], [-5, 5], [-5, 5]),
  clavicle: L("shoulder", [-15, 15], [-10, 10], [-15, 25]),
  shoulder01: L("shoulder", [-15, 15], [-10, 10], [-15, 20]),
  // Rest is an A-pose about 40 degrees abducted: abduction to vertical is +140, adduction -70.
  upperarm01: L("arm", [-60, 170], [-45, 45], [-70, 140]),
  upperarm02: L("arm", NONE, [-45, 45], NONE),
  // The rest elbow is already flexed about 40 degrees forward (measured on the default body).
  lowerarm01: L("elbow", [-45, 110], [-40, 40], NONE),
  lowerarm02: L("elbow", NONE, [-50, 50], NONE),
  wrist: L("wrist", [-70, 70], [-10, 10], [-25, 25]),
  metacarpal1: L("hand", [-10, 10], NONE, [-5, 5]),
  metacarpal2: L("hand", [-10, 10], NONE, [-5, 5]),
  metacarpal3: L("hand", [-10, 10], NONE, [-5, 5]),
  metacarpal4: L("hand", [-10, 10], NONE, [-5, 5]),
  "finger1-1": L("thumb", [-30, 30], [-20, 20], [-45, 20]),
  "finger1-2": L("thumb", [-10, 10], NONE, [-60, 10]),
  "finger1-3": L("thumb", [-10, 10], NONE, [-80, 10]),
  upperleg01: L("hip", [-120, 30], [-25, 25], [-45, 30]),
  upperleg02: L("hip", NONE, [-20, 20], NONE),
  lowerleg01: L("knee", [-5, 150], [-10, 10], NONE),
  lowerleg02: L("knee", NONE, [-10, 10], NONE),
  foot: L("ankle", [-20, 50], [-15, 15], [-20, 20]),
};
for (let f = 2; f <= 5; f += 1) {
  TABLE[`finger${f}-1`] = L("finger", [-20, 90], NONE, [-20, 20]);
  TABLE[`finger${f}-2`] = L("finger", [-5, 100], NONE, NONE);
  TABLE[`finger${f}-3`] = L("finger", [-5, 80], NONE, NONE);
}
for (let t = 1; t <= 5; t += 1) {
  TABLE[`toe${t}-1`] = L("toe", [-60, 40], NONE, [-10, 10]);
  TABLE[`toe${t}-2`] = L("toe", [-10, 60], NONE, NONE);
  if (t > 1) TABLE[`toe${t}-3`] = L("toe", [-10, 60], NONE, NONE);
}

const negate = ([min, max]: Range): Range => [-max, -min];
const DEG = Math.PI / 180;

/** Limit and group for a rig bone name (`upperarm01.R`), or undefined if the bone is not posable. */
export function jointLimit(name: string): { group: JointGroup; limit: JointLimit } | undefined {
  const side = name.match(/\.(L|R)$/)?.[1];
  const entry = TABLE[side ? name.slice(0, -2) : name];
  if (!entry) return undefined;
  if (side !== "R") return entry;
  return { group: entry.group, limit: { x: entry.limit.x, y: negate(entry.limit.y), z: negate(entry.limit.z) } };
}

const clamp = (value: number, [min, max]: Range) => Math.min(max * DEG, Math.max(min * DEG, value));

/** Clamps a pose delta (rotation on top of the rest frame) into the bone's limits. */
export function clampBoneDelta(name: string, delta: Quaternion): Quaternion {
  const entry = jointLimit(name);
  if (!entry) return delta.clone();
  const { swingX, swingZ, twist } = toSwingTwist(delta);
  const { x, y, z } = entry.limit;
  let sx = clamp(swingX, x);
  let sz = clamp(swingZ, z);
  // A swing past 180 degrees would decompose as the opposite swing; every range contains 0, so
  // scaling towards 0 stays inside the box.
  const angle = Math.hypot(sx, sz);
  if (angle > MAX_SWING) [sx, sz] = [(sx * MAX_SWING) / angle, (sz * MAX_SWING) / angle];
  return fromSwingTwist({ swingX: sx, swingZ: sz, twist: clamp(twist, y) });
}

const MAX_SWING = 179 * DEG;
