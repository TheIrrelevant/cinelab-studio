/**
 * @file bone-frames.test.ts
 * @description Bone frame math: Blender's head/tail/roll basis (orthonormal, Y along the bone,
 *   roll around it, degenerate -Y case), the Y-up conversion, and pose deltas on rest frames.
 * @scope cinelab-studio
 * @depends ./bone-frames
 */

import { describe, expect, it } from "vitest";
import { Bone, Matrix4, Quaternion, Vector3 } from "three";
import { blenderBoneBasis, bonePoseDelta, boneRestQuaternion, setBonePoseDelta } from "./bone-frames";

const columns = (b: number[]) => [0, 1, 2].map((c) => new Vector3(b[c * 3], b[c * 3 + 1], b[c * 3 + 2]));
const near = (a: Vector3, b: Vector3) => expect(a.distanceTo(b)).toBeLessThan(1e-9);

describe("blenderBoneBasis", () => {
  it("is the identity for a +Y bone without roll", () => {
    expect(blenderBoneBasis([0, 1, 0], 0).map((v) => v + 0)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });

  it("is orthonormal and right-handed with Y along the bone", () => {
    for (let i = 0; i < 200; i += 1) {
      const dir = new Vector3(Math.sin(i * 1.7), Math.cos(i * 0.9), Math.sin(i * 2.3 + 1)).normalize();
      const [x, y, z] = columns(blenderBoneBasis([dir.x, dir.y, dir.z], i * 0.37 - 3));
      near(y, dir);
      expect(Math.abs(x.length() - 1) + Math.abs(z.length() - 1)).toBeLessThan(1e-9);
      expect(Math.abs(x.dot(y)) + Math.abs(y.dot(z)) + Math.abs(z.dot(x))).toBeLessThan(1e-9);
      near(new Vector3().crossVectors(x, y), z);
    }
  });

  it("turns the frame around the bone by the roll", () => {
    const [x] = columns(blenderBoneBasis([0, 1, 0], Math.PI / 2));
    near(x, new Vector3(0, 0, -1));
  });

  it("handles a bone pointing exactly along -Y", () => {
    expect(blenderBoneBasis([0, -1, 0], 0).map((v) => v + 0)).toEqual([-1, 0, 0, 0, -1, 0, 0, 0, 1]);
  });

  it("stays continuous next to -Y", () => {
    const a = columns(blenderBoneBasis(new Vector3(1e-3, -1, 0).normalize().toArray(), 0));
    const b = columns(blenderBoneBasis(new Vector3(2e-3, -1, 0).normalize().toArray(), 0));
    for (let c = 0; c < 3; c += 1) expect(a[c].distanceTo(b[c])).toBeLessThan(0.05);
  });
});

describe("boneRestQuaternion", () => {
  it("gives the identity for an upright bone without roll (Blender +Z is our +Y)", () => {
    expect(boneRestQuaternion([0, 0, 0], [0, 1, 0], 0).angleTo(new Quaternion())).toBeLessThan(1e-9);
  });

  it("points local Y from head to tail", () => {
    const head = [0.1, 0.9, -0.2] as const;
    const tail = [0.4, 0.5, 0.3] as const;
    const q = boneRestQuaternion(head, tail, 1.2);
    const expected = new Vector3(tail[0] - head[0], tail[1] - head[1], tail[2] - head[2]).normalize();
    near(new Vector3(0, 1, 0).applyQuaternion(q), expected);
  });

  it("maps Blender roll onto our axes", () => {
    // Upright bone (Blender +Z) with roll 90 deg: Blender X turns to Blender +Y (back), our -Z.
    const q = boneRestQuaternion([0, 0, 0], [0, 1, 0], Math.PI / 2);
    near(new Vector3(1, 0, 0).applyQuaternion(q), new Vector3(0, 0, -1));
  });

  it("returns the identity for a zero-length bone", () => {
    expect(boneRestQuaternion([1, 2, 3], [1, 2, 3], 0.5).angleTo(new Quaternion())).toBe(0);
  });
});

describe("pose deltas", () => {
  it("apply on top of the stored rest frame", () => {
    const bone = new Bone();
    const rest = new Quaternion().setFromRotationMatrix(new Matrix4().makeRotationZ(0.7));
    bone.userData.restQuaternion = rest.clone();
    const delta = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.4);
    setBonePoseDelta(bone, delta);
    expect(bone.quaternion.angleTo(rest.clone().multiply(delta))).toBeLessThan(1e-6);
    expect(bonePoseDelta(bone).angleTo(delta)).toBeLessThan(1e-6);
  });

  it("treat a bone without a rest frame as identity rest", () => {
    const bone = new Bone();
    bone.rotation.set(0.2, 0.1, 0);
    expect(bonePoseDelta(bone).angleTo(bone.quaternion)).toBeLessThan(1e-6);
  });
});
