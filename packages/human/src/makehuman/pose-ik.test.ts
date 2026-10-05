/**
 * @file pose-ik.test.ts
 * @description Plan 1.5 on the real skeleton: with legs in IK mode the feet keep floor contact
 *   (position and orientation) when the root moves down; hands in IK stay put when the spine
 *   bends; editing a bone of an IK limb moves its target instead; FK/IK switching never changes
 *   the pose; one undo reverts an edit together with its IK settle.
 * @scope cinelab-studio
 * @depends ./pose-ik, ./pose-editor, ./limbs, ./load-body
 */

import { beforeAll, describe, expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { buildAssets } from "../../scripts/build-assets.ts";
import { applyBodyShape } from "./body-shape";
import { LIMBS } from "./limbs";
import { parseBody } from "./load-body";
import { DEFAULT_BODY } from "./macro";
import * as P from "./pose-editor";
import { applySnapshot, effectorPosition, settleIk, type PoseRig } from "./pose-ik";

let rig: PoseRig;
const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
const DEG = Math.PI / 180;

beforeAll(async () => {
  const built = buildAssets();
  const body = await parseBody({ glb: buffer(built.glb), manifest: built.manifest, morphs: buffer(built.morphBin), proxyManifest: built.proxyManifest, proxies: buffer(built.proxyBin) });
  applyBodyShape(body.mesh, body.data, DEFAULT_BODY);
  rig = { skeleton: body.mesh.skeleton, bones: body.data.manifest.bones };
}, 60_000);

const ikOn = (editor: P.PoseEditor, ...limbs: (keyof typeof LIMBS)[]) =>
  limbs.reduce((e, limb) => P.setIkTarget(e, limb, effectorPosition(rig, e, limb)), editor);
const worldOf = (editor: P.PoseEditor, bone: string) => {
  const bones = applySnapshot(rig, editor);
  return { at: bones.get(bone)!.getWorldPosition(new Vector3()), q: bones.get(bone)!.getWorldQuaternion(new Quaternion()) };
};

describe("IK in the pose editor (plan 1.5)", () => {
  it("keeps the feet on the floor when the hips move down", () => {
    let e = ikOn(P.createPoseEditor(), "leg.L", "leg.R");
    const before = ["foot.L", "foot.R"].map((foot) => worldOf(e, foot));
    e = settleIk(rig, P.setRootOffset(e, new Vector3(0.02, -0.08, 0.02)));
    ["foot.L", "foot.R"].forEach((foot, i) => {
      const after = worldOf(e, foot);
      expect(after.at.distanceTo(before[i].at), foot).toBeLessThan(0.002);
      expect(after.q.angleTo(before[i].q), foot).toBeLessThan(1 * DEG);
    });
    expect(P.rotationOf(e, "lowerleg01.L").angleTo(new Quaternion())).toBeGreaterThan(10 * DEG);
  });

  it("keeps IK hands in place when the spine bends", () => {
    let e = ikOn(P.createPoseEditor(), "arm.L");
    const hand = worldOf(e, "wrist.L").at;
    e = settleIk(rig, P.setRotation(e, "spine02", new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 12 * DEG)), ["spine02"]);
    expect(worldOf(e, "wrist.L").at.distanceTo(hand)).toBeLessThan(0.003);
    expect(P.rotationOf(e, "spine02").angleTo(new Quaternion())).toBeGreaterThan(10 * DEG);
  });

  it("moves the target when a bone of the IK limb is edited", () => {
    let e = ikOn(P.createPoseEditor(), "arm.R");
    e = settleIk(rig, P.setRotation(e, "lowerarm01.R", new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 60 * DEG)), ["lowerarm01.R"]);
    const [x, y, z] = e.current.ik["arm.R"]!;
    expect(new Vector3(x, y, z).distanceTo(worldOf(e, "wrist.R").at)).toBeLessThan(1e-6);
    expect(P.rotationOf(e, "lowerarm01.R").angleTo(new Quaternion())).toBeGreaterThan(50 * DEG);
  });

  it("switches FK/IK without changing the pose", () => {
    let e = P.setRotation(P.createPoseEditor(), "upperarm01.L", new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 30 * DEG));
    const rotations = structuredClone(e.current.rotations);
    e = ikOn(e, "arm.L");
    expect(e.current.rotations).toEqual(rotations);
    // Settling onto the target it was just given changes nothing visible.
    const settled = settleIk(rig, e);
    for (const bone of Object.keys(settled.current.rotations)) expect(P.rotationOf(settled, bone).angleTo(P.rotationOf(e, bone)), bone).toBeLessThan(1e-4);
    e = P.setIkTarget(e, "arm.L", null);
    expect(e.current.rotations).toEqual(rotations);
    expect(e.current.ik).toEqual({});
  });

  it("reverts an edit and its IK settle with one undo", () => {
    let e = ikOn(P.createPoseEditor(), "leg.L");
    const before = structuredClone(e.current);
    e = settleIk(rig, P.setRootOffset(e, new Vector3(0, -0.1, 0)));
    expect(P.undo(e).current).toEqual(before);
  });

  it("reset all returns every limb to FK at rest", () => {
    const e = P.resetAll(settleIk(rig, P.setRootOffset(ikOn(P.createPoseEditor(), "leg.R"), new Vector3(0, -0.1, 0))));
    expect(e.current).toEqual({ rotations: {}, rootOffset: [0, 0, 0], ik: {} });
  });
});
