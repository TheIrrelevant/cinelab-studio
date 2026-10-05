/**
 * @file body-shape.test.ts
 * @description Shapes the real converted MakeHuman body: every macro weight resolves to a packed
 *   target, bodies stay grounded, height/gender/age change the size, and after the skeleton
 *   refit the skinned rest pose reproduces the morphed vertices exactly; pose deltas and the root
 *   offset survive re-shapes.
 * @scope cinelab-studio
 * @depends ./body-shape, ./load-body, ./macro, ../../scripts/build-assets.ts
 */

import { beforeAll, describe, expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { buildAssets } from "../../scripts/build-assets.ts";
import { applyBodyShape } from "./body-shape";
import { applyBodyPose } from "./body-pose";
import { bonePoseDelta, setBonePoseDelta } from "./bone-frames";
import { parseBody, type LoadedBody } from "./load-body";
import { DEFAULT_BODY, macroTargetWeights, type BodyParams } from "./macro";

let body: LoadedBody;
const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

beforeAll(async () => {
  const built = buildAssets();
  body = await parseBody({
    glb: buffer(built.glb),
    manifest: built.manifest,
    morphs: buffer(built.morphBin),
    proxyManifest: built.proxyManifest,
    proxies: buffer(built.proxyBin),
  });
}, 60_000);

const shape = (params: Partial<BodyParams>) => applyBodyShape(body.mesh, body.data, { ...DEFAULT_BODY, ...params });

describe("applyBodyShape", () => {
  it("finds every weighted target in the pack across the parameter range", () => {
    for (const gender of [0, 1]) {
      for (const ageYears of [18, 30, 35]) {
        for (const level of [0, 0.3, 0.7, 1]) {
          const params = { ...DEFAULT_BODY, gender, ageYears, muscle: level, weight: 1 - level, height: level, proportions: level };
          for (const name of macroTargetWeights(params).keys()) expect(body.data.targets.has(name), name).toBe(true);
        }
      }
    }
  });

  it("keeps bodies grounded and changes height plausibly", () => {
    const short = shape({ gender: 0, height: 0 });
    const tall = shape({ gender: 1, height: 1 });
    const average = shape({});
    for (const result of [short, tall, average]) {
      const floor = Math.min(...Array.from({ length: result.source.length / 3 }, (_, i) => result.source[i * 3 + 1]));
      expect(Math.abs(floor)).toBeLessThan(0.05);
    }
    // MakeHuman's raw height range: about 1.22 m (short female) to 2.45 m (tall male).
    expect(short.heightMetres).toBeGreaterThan(1.15);
    expect(tall.heightMetres).toBeLessThan(2.5);
    expect(average.heightMetres).toBeGreaterThan(1.55);
    expect(average.heightMetres).toBeLessThan(1.8);
    expect(tall.heightMetres - short.heightMetres).toBeGreaterThan(0.5);
    expect(shape({ gender: 1 }).heightMetres).toBeGreaterThan(shape({ gender: 0 }).heightMetres);
  });

  it("refits the skeleton so the skinned rest pose equals the morphed mesh", () => {
    shape({ gender: 1, height: 1, weight: 0.9, african: 1, asian: 0, caucasian: 0 });
    const position = body.mesh.geometry.getAttribute("position");
    body.mesh.skeleton.update();
    for (const i of [0, 1234, 5000, 9999, position.count - 1]) {
      const skinned = body.mesh.applyBoneTransform(i, new Vector3().fromBufferAttribute(position, i));
      expect(skinned.distanceTo(new Vector3().fromBufferAttribute(position, i)), `vertex ${i}`).toBeLessThan(1e-4);
    }
  });

  it("moves the head bone with the body height", () => {
    const headIndex = body.data.manifest.bones.findIndex((bone) => bone.name === "head");
    const headY = () => body.mesh.skeleton.bones[headIndex].getWorldPosition(new Vector3()).y;
    shape({ height: 0 });
    const low = headY();
    shape({ height: 1 });
    expect(headY()).toBeGreaterThan(low + 0.1);
  });

  it("keeps each bone's pose delta across a re-shape", () => {
    const bone = body.mesh.skeleton.bones[5];
    const delta = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.3);
    setBonePoseDelta(bone, delta);
    shape({ weight: 0.2 });
    expect(bonePoseDelta(bone).angleTo(delta)).toBeLessThan(1e-6);
    setBonePoseDelta(bone, new Quaternion());
  });

  it("offsets the root from its rest position and re-applies it after a re-shape", () => {
    const root = body.mesh.skeleton.bones[0];
    shape({});
    const rest = root.position.clone();
    applyBodyPose(body.mesh.skeleton, body.data.manifest.bones, {}, [0, 0.2, -0.1]);
    expect(root.position.clone().sub(rest).distanceTo(new Vector3(0, 0.2, -0.1))).toBeLessThan(1e-9);
    shape({ height: 1 });
    const tallRest = root.position.clone();
    applyBodyPose(body.mesh.skeleton, body.data.manifest.bones, {}, [0, 0.2, -0.1]);
    expect(root.position.clone().sub(tallRest).distanceTo(new Vector3(0, 0.2, -0.1))).toBeLessThan(1e-9);
    applyBodyPose(body.mesh.skeleton, body.data.manifest.bones, {});
    shape({});
  });
});
