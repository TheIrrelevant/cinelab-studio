/**
 * @file poses.ts
 * @description Joint rotations for the placeholder mannequin's preset poses.
 * @scope cinelab-studio
 * @depends none
 */

export const POSE_IDS = ["standing", "relaxed", "handsOnHips", "walking", "armsUp"] as const;
export type PoseId = (typeof POSE_IDS)[number];

export type Joint =
  | "spine" | "head"
  | "leftShoulder" | "leftElbow" | "rightShoulder" | "rightElbow"
  | "leftHip" | "leftKnee" | "rightHip" | "rightKnee";

/** Euler angles in degrees. Limbs hang along -y; the figure faces +z; "left" is the -x side. */
export type PoseAngles = Record<Joint, [number, number, number]>;

const ZERO: [number, number, number] = [0, 0, 0];
const neutral = (): PoseAngles => ({
  spine: ZERO, head: ZERO,
  leftShoulder: [0, 0, -6], leftElbow: ZERO, rightShoulder: [0, 0, 6], rightElbow: ZERO,
  leftHip: ZERO, leftKnee: ZERO, rightHip: ZERO, rightKnee: ZERO,
});

export const POSES: Record<PoseId, { label: string; angles: PoseAngles }> = {
  standing: { label: "Standing", angles: neutral() },
  relaxed: {
    label: "Relaxed",
    angles: {
      ...neutral(),
      spine: [0, 0, 4], head: [0, -8, -5],
      leftShoulder: [0, 0, -10], rightShoulder: [-6, 0, 8], rightElbow: [-14, 0, 0],
      leftHip: [0, 0, -4], rightHip: [-8, 0, 3], rightKnee: [16, 0, 0],
    },
  },
  handsOnHips: {
    label: "Hands on hips",
    angles: {
      ...neutral(),
      leftShoulder: [0, 0, -42], leftElbow: [0, 0, 100],
      rightShoulder: [0, 0, 42], rightElbow: [0, 0, -100],
      leftHip: [0, 0, -5], rightHip: [0, 0, 5],
    },
  },
  walking: {
    label: "Walking",
    angles: {
      ...neutral(),
      leftShoulder: [20, 0, -6], leftElbow: [-18, 0, 0],
      rightShoulder: [-20, 0, 6], rightElbow: [-18, 0, 0],
      leftHip: [-22, 0, 0], leftKnee: [8, 0, 0],
      rightHip: [16, 0, 0], rightKnee: [28, 0, 0],
    },
  },
  armsUp: {
    label: "Arms up",
    angles: {
      ...neutral(),
      head: [-10, 0, 0],
      leftShoulder: [0, 0, -165], rightShoulder: [0, 0, 165],
      leftElbow: [0, 0, 10], rightElbow: [0, 0, -10],
    },
  },
};

export function poseAngles(pose: PoseId): PoseAngles {
  return POSES[pose]?.angles ?? POSES.standing.angles;
}
