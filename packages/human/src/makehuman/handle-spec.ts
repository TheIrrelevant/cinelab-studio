/**
 * @file handle-spec.ts
 * @description Which bones get on-body joint handles and how they look: one handle per posable
 *   bone; centre line white, right red, left blue, one colour per finger (metacarpals take their
 *   finger's colour); IK end effectors (wrists, feet) are triangles. Sizes follow the joint group.
 * @scope cinelab-studio
 * @depends ./joint-limits
 */

import { jointLimit, type JointGroup } from "./joint-limits";

export type HandleShape = "sphere" | "triangle";
export type HandleSide = "L" | "R" | "C";
export type HandleSpec = {
  /** Rig bone name, e.g. `lowerarm01.L`. */
  bone: string;
  side: HandleSide;
  group: JointGroup;
  color: string;
  shape: HandleShape;
  /** Metres. */
  radius: number;
  /** Hidden by the finger handle toggle. */
  finger: boolean;
};

export const HANDLE_COLOURS = {
  centre: "#f5f5f5",
  right: "#ef4444",
  left: "#3b82f6",
  /** Thumb, index, middle, ring, little. */
  fingers: ["#f59e0b", "#22c55e", "#a855f7", "#ec4899", "#14b8a6"],
  hover: "#ffffff",
  selected: "#facc15",
} as const;

/** Wrists and feet; IK targets in plan 1.5. */
export const IK_EFFECTORS = new Set(["wrist.L", "wrist.R", "foot.L", "foot.R"]);

const FINGER_GROUPS = new Set<JointGroup>(["thumb", "finger", "hand"]);
const SMALL_GROUPS = new Set<JointGroup>(["thumb", "finger", "hand", "toe"]);

/** 1-5 (thumb to little) for finger and metacarpal bones, else 0. */
export function fingerIndex(bone: string): number {
  const finger = bone.match(/^finger(\d)-/);
  if (finger) return Number(finger[1]);
  const metacarpal = bone.match(/^metacarpal(\d)/);
  return metacarpal ? Number(metacarpal[1]) + 1 : 0;
}

function radius(bone: string, group: JointGroup): number {
  if (group === "root") return 0.03;
  if (SMALL_GROUPS.has(group)) return 0.005;
  if (group === "eye" || group === "jaw") return 0.008;
  // Twist-only segments sit between joints.
  if (/02\.[LR]$/.test(bone)) return 0.009;
  return 0.013;
}

/** Handle specs for the posable bones among `bones`, in the given order. */
export function handleSpecs(bones: readonly string[]): HandleSpec[] {
  return bones.flatMap((bone) => {
    const entry = jointLimit(bone);
    if (!entry) return [];
    const side: HandleSide = bone.endsWith(".L") ? "L" : bone.endsWith(".R") ? "R" : "C";
    const finger = FINGER_GROUPS.has(entry.group);
    const index = fingerIndex(bone);
    const sideColour = side === "L" ? HANDLE_COLOURS.left : side === "R" ? HANDLE_COLOURS.right : HANDLE_COLOURS.centre;
    return [{
      bone,
      side,
      group: entry.group,
      color: index > 0 ? HANDLE_COLOURS.fingers[index - 1] : sideColour,
      shape: IK_EFFECTORS.has(bone) ? "triangle" : "sphere",
      radius: radius(bone, entry.group),
      finger,
    }];
  });
}
