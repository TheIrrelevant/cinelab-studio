/**
 * @file swing-twist.test.ts
 * @description Swing-twist split: pure twist and pure swing are recognised, any rotation below
 *   180 degrees round-trips, and the twist is the rotation around the bone axis.
 * @scope cinelab-studio
 * @depends ./swing-twist
 */

import { describe, expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { fromSwingTwist, toSwingTwist } from "./swing-twist";

const axisAngle = (x: number, y: number, z: number, angle: number) => new Quaternion().setFromAxisAngle(new Vector3(x, y, z).normalize(), angle);

describe("swing-twist", () => {
  it("reads a rotation around Y as pure twist", () => {
    const result = toSwingTwist(axisAngle(0, 1, 0, 0.8));
    expect(result.twist).toBeCloseTo(0.8, 9);
    expect(Math.hypot(result.swingX, result.swingZ)).toBeLessThan(1e-9);
  });

  it("reads a rotation around an X/Z axis as pure swing vector", () => {
    const result = toSwingTwist(axisAngle(3, 0, 4, 1.5));
    expect(result.swingX).toBeCloseTo(0.9, 9);
    expect(result.swingZ).toBeCloseTo(1.2, 9);
    expect(result.twist).toBeCloseTo(0, 9);
  });

  it("handles swings beyond 90 degrees on both axes", () => {
    const parts = { swingX: 2.2, swingZ: 1.6, twist: -0.4 };
    const result = toSwingTwist(fromSwingTwist(parts));
    expect(result.swingX).toBeCloseTo(parts.swingX, 6);
    expect(result.swingZ).toBeCloseTo(parts.swingZ, 6);
    expect(result.twist).toBeCloseTo(parts.twist, 6);
  });

  it("round-trips random rotations", () => {
    for (let i = 0; i < 500; i += 1) {
      const q = axisAngle(Math.sin(i * 1.3), Math.cos(i * 0.7), Math.sin(i * 2.9 + 0.5), ((i % 97) / 97) * 3.1);
      expect(fromSwingTwist(toSwingTwist(q)).angleTo(q)).toBeLessThan(1e-6);
    }
  });

  it("keeps the bone axis direction determined by the swing alone", () => {
    const parts = { swingX: 0.7, swingZ: -0.3, twist: 1.1 };
    const withTwist = new Vector3(0, 1, 0).applyQuaternion(fromSwingTwist(parts));
    const swingOnly = new Vector3(0, 1, 0).applyQuaternion(fromSwingTwist({ ...parts, twist: 0 }));
    expect(withTwist.distanceTo(swingOnly)).toBeLessThan(1e-9);
  });
});
