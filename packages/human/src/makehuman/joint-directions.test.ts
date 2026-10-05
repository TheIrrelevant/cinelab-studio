/**
 * @file joint-directions.test.ts
 * @description Plan 1.2 on the real skeleton: right bone frames mirror left ones (so mirrored
 *   limits mirror motion), and the limit ends bend joints the anatomical way on both sides -
 *   knees backwards, elbows up, hips forwards, arms out and up, feet down, spine forwards.
 * @scope cinelab-studio
 * @depends ./body-shape, ./bone-frames, ./joint-limits, ./swing-twist, ./load-body
 */

import { beforeAll, describe, expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { buildAssets } from "../../scripts/build-assets.ts";
import { applyBodyShape } from "./body-shape";
import { setBonePoseDelta } from "./bone-frames";
import { clampBoneDelta, jointLimit } from "./joint-limits";
import { parseBody, type LoadedBody } from "./load-body";
import { DEFAULT_BODY } from "./macro";
import { fromSwingTwist } from "./swing-twist";

let body: LoadedBody;
const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
const DEG = Math.PI / 180;

beforeAll(async () => {
  const built = buildAssets();
  body = await parseBody({
    glb: buffer(built.glb),
    manifest: built.manifest,
    morphs: buffer(built.morphBin),
    proxyManifest: built.proxyManifest,
    proxies: buffer(built.proxyBin),
  });
  applyBodyShape(body.mesh, body.data, DEFAULT_BODY);
}, 60_000);

const index = (name: string) => body.data.manifest.bones.findIndex((bone) => bone.name === name);
const bone = (name: string) => body.mesh.skeleton.bones[index(name)];
const worldHead = (name: string) => {
  body.mesh.updateMatrixWorld(true);
  return bone(name).getWorldPosition(new Vector3());
};

/** Moves `child`'s head while `name` is posed at (a fraction of) one end of a limit axis, then resets. */
function displacement(name: string, axis: "x" | "z", end: 0 | 1, child: string, fraction = 1): Vector3 {
  const before = worldHead(child);
  const degrees = jointLimit(name)!.limit[axis][end] * fraction;
  const delta = fromSwingTwist({ swingX: axis === "x" ? degrees * DEG : 0, swingZ: axis === "z" ? degrees * DEG : 0, twist: 0 });
  setBonePoseDelta(bone(name), clampBoneDelta(name, delta));
  const after = worldHead(child);
  setBonePoseDelta(bone(name), new Quaternion());
  return after.sub(before);
}

describe("joint limit directions (plan 1.2)", () => {
  it("has right bone frames mirroring left ones: (-mX, mY, mZ)", () => {
    body.mesh.updateMatrixWorld(true);
    const mirror = (v: Vector3) => new Vector3(-v.x, v.y, v.z);
    let worst = 0;
    for (const spec of body.data.manifest.bones.filter((b) => b.name.endsWith(".L"))) {
      const left = bone(spec.name).matrixWorld;
      const right = bone(spec.name.replace(/\.L$/, ".R")).matrixWorld;
      const [lx, ly, lz] = [0, 1, 2].map((c) => new Vector3().setFromMatrixColumn(left, c));
      const [rx, ry, rz] = [0, 1, 2].map((c) => new Vector3().setFromMatrixColumn(right, c));
      worst = Math.max(worst, rx.distanceTo(mirror(lx).negate()), ry.distanceTo(mirror(ly)), rz.distanceTo(mirror(lz)));
    }
    expect(worst).toBeLessThan(0.05);
  });

  for (const side of ["L", "R"] as const) {
    const sign = side === "L" ? 1 : -1;
    it(`knee flexes backwards (${side})`, () => {
      expect(displacement(`lowerleg01.${side}`, "x", 1, `foot.${side}`, 0.5).z).toBeLessThan(-0.2);
    });
    it(`elbow flexes the hand up (${side})`, () => {
      expect(displacement(`lowerarm01.${side}`, "x", 1, `wrist.${side}`).y).toBeGreaterThan(0.1);
    });
    it(`hip flexes the knee forwards (${side})`, () => {
      expect(displacement(`upperleg01.${side}`, "x", 0, `lowerleg01.${side}`).z).toBeGreaterThan(0.2);
    });
    it(`hip abducts the knee outwards (${side})`, () => {
      const end = side === "L" ? 0 : 1;
      expect(sign * displacement(`upperleg01.${side}`, "z", end, `lowerleg01.${side}`).x).toBeGreaterThan(0.1);
    });
    it(`shoulder abducts the arm up (${side})`, () => {
      const end = side === "L" ? 1 : 0;
      expect(displacement(`upperarm01.${side}`, "z", end, `lowerarm01.${side}`).y).toBeGreaterThan(0.2);
    });
    it(`shoulder flexes the arm forwards (${side})`, () => {
      expect(displacement(`upperarm01.${side}`, "x", 1, `lowerarm01.${side}`, 0.4).z).toBeGreaterThan(0.1);
    });
    it(`foot points the toes down (${side})`, () => {
      expect(displacement(`foot.${side}`, "x", 1, `toe3-1.${side}`).y).toBeLessThan(-0.03);
    });
  }

  it("spine and neck bend forwards with +X", () => {
    expect(displacement("spine02", "x", 1, "head").z).toBeGreaterThan(0.03);
    expect(displacement("neck01", "x", 1, "head").z).toBeGreaterThan(0.01);
  });
});
