/**
 * @file skeleton-frames.test.ts
 * @description Human creator plan step 1.1 acceptance: on five body shapes every one of the 163
 *   bones has local Y pointing at its tail within 1 degree, the skinned rest pose reproduces the
 *   morphed mesh within 0.1 mm, and our Blender axis mapping agrees with the rig's default positions.
 * @scope cinelab-studio
 * @depends ./body-shape, ./load-body, ./macro, ../../scripts/build-assets.ts, rig.default.json
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { ASSETS, buildAssets } from "../../scripts/build-assets.ts";
import { applyBodyShape } from "./body-shape";
import { jointPosition } from "./morph-data";
import { parseBody, type LoadedBody } from "./load-body";
import { DEFAULT_BODY, type BodyParams } from "./macro";

let body: LoadedBody;
const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
const RIG_PATH = join(ASSETS, "rigs/standard/rig.default.json");

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

const SHAPES: Array<[string, Partial<BodyParams>]> = [
  ["default", {}],
  ["short slim female", { gender: 0, height: 0, weight: 0.1, muscle: 0.2 }],
  ["tall heavy male", { gender: 1, height: 1, weight: 1, muscle: 0.5, african: 1, asian: 0, caucasian: 0 }],
  ["muscular male 35", { gender: 1, ageYears: 35, muscle: 1, weight: 0.4, proportions: 1 }],
  ["curvy asian female", { gender: 0, weight: 0.8, proportions: 0, african: 0, asian: 1, caucasian: 0 }],
];
const DEGREE = Math.PI / 180;

describe("bone rest frames (plan 1.1)", () => {
  it("uses Blender axes that match the rig's default positions", () => {
    // default_position comes from MPFB's shaped default body, not the base mesh, so directions
    // differ by a few degrees; the median separates the right axis mapping from a mirrored one.
    const rig = JSON.parse(readFileSync(RIG_PATH, "utf8")) as Record<string, { head: { default_position: number[] }; tail: { default_position: number[] } }>;
    const base = body.data.basePositions;
    const ours: number[] = [];
    const mirrored: number[] = [];
    for (const bone of body.data.manifest.bones) {
      const { head, tail } = rig[bone.name];
      const blender = new Vector3().fromArray(tail.default_position).sub(new Vector3().fromArray(head.default_position));
      const [hx, hy, hz] = jointPosition(base, bone.head);
      const [tx, ty, tz] = jointPosition(base, bone.tail);
      // Ours (x, y, z) is Blender (x, -z, y).
      ours.push(new Vector3(tx - hx, -(tz - hz), ty - hy).angleTo(blender) / DEGREE);
      mirrored.push(new Vector3(tx - hx, tz - hz, ty - hy).angleTo(blender) / DEGREE);
    }
    const median = (values: number[]) => [...values].sort((x, y) => x - y)[Math.floor(values.length / 2)];
    expect(median(ours)).toBeLessThan(15);
    expect(median(mirrored)).toBeGreaterThan(45);
  });

  for (const [label, params] of SHAPES) {
    it(`points local Y at the tail for all bones and keeps the rest pose exact: ${label}`, () => {
      const { source } = applyBodyShape(body.mesh, body.data, { ...DEFAULT_BODY, ...params });
      const { bones } = body.mesh.skeleton;
      expect(bones).toHaveLength(163);
      body.mesh.updateMatrixWorld(true);
      let worstAngle = 0;
      body.data.manifest.bones.forEach((spec, i) => {
        const head = new Vector3(...jointPosition(source, spec.head));
        const toTail = new Vector3(...jointPosition(source, spec.tail)).sub(head);
        expect(toTail.length(), spec.name).toBeGreaterThan(1e-6);
        const localY = new Vector3().setFromMatrixColumn(bones[i].matrixWorld, 1);
        worstAngle = Math.max(worstAngle, localY.angleTo(toTail));
      });
      expect(worstAngle / DEGREE).toBeLessThan(1);

      body.mesh.skeleton.update();
      const position = body.mesh.geometry.getAttribute("position");
      const rest = new Vector3();
      let worstError = 0;
      for (let v = 0; v < position.count; v += 1) {
        rest.fromBufferAttribute(position, v);
        worstError = Math.max(worstError, body.mesh.applyBoneTransform(v, rest.clone()).distanceTo(rest));
      }
      expect(worstError).toBeLessThan(1e-4);
    });
  }
});
