/**
 * @file ik-solver.test.ts
 * @description Plan 1.5 acceptance on the real skeleton: for targets anywhere inside each limb's
 *   reach (generated from random in-limit poses) the two-bone IK brings the hand or foot to the
 *   target without violating joint limits; out-of-reach targets stretch towards them; the end
 *   effector keeps its world orientation unless the ankle limit forbids it; with a pole the middle
 *   joint bends towards it.
 * @scope cinelab-studio
 * @depends ./ik-solver, ./limbs, ./body-pose, ./joint-limits, ./swing-twist, ./load-body
 */

import { beforeAll, describe, expect, it } from "vitest";
import { Quaternion, Vector3, type Bone } from "three";
import { buildAssets } from "../../scripts/build-assets.ts";
import { applyBodyPose, type BodyPose } from "./body-pose";
import { applyBodyShape } from "./body-shape";
import { solveTwoBone } from "./ik-solver";
import { jointLimit } from "./joint-limits";
import { LIMB_IDS, LIMBS } from "./limbs";
import { parseBody, type LoadedBody } from "./load-body";
import { DEFAULT_BODY } from "./macro";
import { fromSwingTwist, toSwingTwist } from "./swing-twist";

let body: LoadedBody;
let bones: Map<string, Bone>;
const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
const DEG = Math.PI / 180;

beforeAll(async () => {
  const built = buildAssets();
  body = await parseBody({ glb: buffer(built.glb), manifest: built.manifest, morphs: buffer(built.morphBin), proxyManifest: built.proxyManifest, proxies: buffer(built.proxyBin) });
  applyBodyShape(body.mesh, body.data, DEFAULT_BODY);
  bones = new Map(body.data.manifest.bones.map((spec, i) => [spec.name, body.mesh.skeleton.bones[i]]));
}, 60_000);

const pose = (p: BodyPose) => {
  applyBodyPose(body.mesh.skeleton, body.data.manifest.bones, p);
  body.mesh.skeleton.bones[0].updateWorldMatrix(true, true);
};
const at = (name: string) => bones.get(name)!.getWorldPosition(new Vector3());
const inLimits = (name: string, q: Quaternion) => {
  const { x, y, z } = jointLimit(name)!.limit;
  const { swingX, swingZ, twist } = toSwingTwist(q);
  const ok = (v: number, [min, max]: readonly [number, number]) => v >= min * DEG - 1e-6 && v <= max * DEG + 1e-6;
  return ok(swingX, x) && ok(swingZ, z) && ok(twist, y);
};
/** Deterministic value in [min, max] scaled by `f` (keeps samples away from the limit edges). */
const pick = (seed: number, [min, max]: readonly [number, number], f = 0.8) => (min + (max - min) * (0.5 + 0.5 * Math.sin(seed * 12.9898) * 1)) * f;

describe("two-bone IK (plan 1.5)", () => {
  for (const id of LIMB_IDS) {
    it(`reaches targets inside the reach of ${id} within limits`, () => {
      const limb = LIMBS[id];
      const upper = jointLimit(limb.upper)!.limit;
      const lower = jointLimit(limb.lower)!.limit;
      let worst = 0;
      for (let i = 0; i < 40; i += 1) {
        const fk: BodyPose = {
          [limb.upper]: fromSwingTwist({ swingX: pick(i + 1, upper.x) * DEG, swingZ: pick(i + 2.5, upper.z) * DEG, twist: pick(i + 4.1, upper.y) * DEG }),
          [limb.lower]: fromSwingTwist({ swingX: pick(i + 7.3, lower.x) * DEG, swingZ: 0, twist: 0 }),
        };
        pose(fk);
        const target = at(limb.end);
        const elbow = at(limb.lower);
        pose({});
        const solved = solveTwoBone(bones, limb, target, elbow);
        for (const [name, q] of Object.entries(solved)) expect(inLimits(name, q), `${id} sample ${i} ${name}`).toBe(true);
        pose(solved);
        worst = Math.max(worst, at(limb.end).distanceTo(target));
      }
      expect(worst).toBeLessThan(0.005);
    });
  }

  it("stretches towards targets out of reach", () => {
    pose({});
    const limb = LIMBS["arm.L"];
    const shoulder = at(limb.upper);
    const far = shoulder.clone().add(new Vector3(2, 0.5, 0.3));
    pose(solveTwoBone(bones, limb, far));
    const reach = at(limb.lower).distanceTo(shoulder) + at(limb.end).distanceTo(at(limb.lower));
    expect(at(limb.end).distanceTo(shoulder)).toBeGreaterThan(reach * 0.97);
    const towards = at(limb.end).sub(shoulder).normalize();
    expect(towards.angleTo(far.clone().sub(shoulder))).toBeLessThan(5 * DEG);
  });

  it("keeps the foot's world orientation while the ankle limits allow it", () => {
    pose({});
    const limb = LIMBS["leg.R"];
    const before = bones.get(limb.end)!.getWorldQuaternion(new Quaternion());
    const target = at(limb.end).add(new Vector3(0, 0.08, 0.04));
    pose(solveTwoBone(bones, limb, target));
    expect(bones.get(limb.end)!.getWorldQuaternion(new Quaternion()).angleTo(before)).toBeLessThan(1 * DEG);
    expect(at(limb.end).distanceTo(target)).toBeLessThan(0.005);
  });

  it("lets the ankle limit win over a flat foot", () => {
    pose({});
    const limb = LIMBS["leg.R"];
    // Knee high: a flat foot would need more dorsiflexion than the limit.
    const solved = solveTwoBone(bones, limb, at(limb.end).add(new Vector3(0, 0.4, 0.15)));
    expect(toSwingTwist(solved[limb.end]).swingX / DEG).toBeCloseTo(jointLimit(limb.end)!.limit.x[0], 6);
  });

  it("bends the knee towards the pole", () => {
    pose({});
    const limb = LIMBS["leg.L"];
    const target = at(limb.end).add(new Vector3(0, 0.25, 0));
    const pole = at(limb.lower).add(new Vector3(0, 0, 1));
    pose(solveTwoBone(bones, limb, target, pole));
    expect(at(limb.lower).z).toBeGreaterThan(at(limb.upper).z + 0.05);
  });
});
