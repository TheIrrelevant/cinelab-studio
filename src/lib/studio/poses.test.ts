/**
 * @file poses.test.ts
 * @description Tests mannequin pose presets: completeness and expected limb directions.
 * @scope cinelab-studio
 * @depends ./poses
 */

import { describe, expect, it } from "vitest";
import { Euler, Vector3 } from "three";
import { POSE_IDS, POSES, poseAngles, type PoseAngles } from "./poses";

const rad = (angles: [number, number, number]) => new Euler(...angles.map((a) => (a * Math.PI) / 180) as [number, number, number]);
/** Direction of the hanging upper limb after its joint rotation. */
const upper = (angles: PoseAngles, joint: keyof PoseAngles) => new Vector3(0, -1, 0).applyEuler(rad(angles[joint]));

describe("poses", () => {
  it("defines every joint for every pose", () => {
    for (const id of POSE_IDS) {
      expect(Object.keys(POSES[id].angles)).toHaveLength(10);
    }
  });

  it("raises both arms above the shoulders for arms up", () => {
    const angles = poseAngles("armsUp");
    expect(upper(angles, "leftShoulder").y).toBeGreaterThan(0.9);
    expect(upper(angles, "rightShoulder").y).toBeGreaterThan(0.9);
  });

  it("swings arms opposite to legs when walking", () => {
    const angles = poseAngles("walking");
    // Left leg forward (+z), left arm back (-z).
    expect(upper(angles, "leftHip").z).toBeGreaterThan(0);
    expect(upper(angles, "leftShoulder").z).toBeLessThan(0);
    expect(upper(angles, "rightShoulder").z).toBeGreaterThan(0);
  });

  it("spreads the elbows outward for hands on hips", () => {
    const angles = poseAngles("handsOnHips");
    expect(upper(angles, "leftShoulder").x).toBeLessThan(-0.5);
    expect(upper(angles, "rightShoulder").x).toBeGreaterThan(0.5);
  });
});
