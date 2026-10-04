/**
 * @file build.test.ts
 * @description End-to-end conversion of the vendored MakeHuman assets: the GLB loads in three's
 *   GLTFLoader as a skinned, grounded, adult-sized body, and the morph pack is consistent.
 * @scope cinelab-studio
 * @depends ../../../scripts/build-assets.ts, ./build.ts, three GLTFLoader
 */

import { beforeAll, describe, expect, it } from "vitest";
import { Box3, PropertyBinding, Vector3, type SkinnedMesh } from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { buildAssets } from "../../../scripts/build-assets.ts";

type Result = ReturnType<typeof buildAssets>;
let result: Result;
let gltf: GLTF;

beforeAll(async () => {
  result = buildAssets();
  const { glb } = result;
  const buffer = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer;
  gltf = await new Promise<GLTF>((resolve, reject) => new GLTFLoader().parse(buffer, "", resolve, reject));
}, 60_000);

describe("MakeHuman GLB", () => {
  it("loads as one skinned mesh with the 163-bone default rig", () => {
    const meshes: SkinnedMesh[] = [];
    gltf.scene.traverse((node) => {
      if ((node as SkinnedMesh).isSkinnedMesh) meshes.push(node as SkinnedMesh);
    });
    expect(meshes).toHaveLength(1);
    expect(meshes[0].skeleton.bones).toHaveLength(163);
    expect(meshes[0].geometry.getAttribute("position").count).toBe(result.manifest.vertexCount);
    expect(meshes[0].geometry.getAttribute("uv")).toBeDefined();
    expect(result.unweighted).toBe(0);
  });

  it("is a grounded adult-sized body in metres", () => {
    const box = new Box3().setFromObject(gltf.scene.getObjectByName("makehuman-body")!);
    const height = box.max.y - box.min.y;
    expect(height).toBeGreaterThan(1.5);
    expect(height).toBeLessThan(2);
    expect(Math.abs(box.min.y)).toBeLessThan(0.05);
  });

  it("places the head bone above the pelvis", () => {
    // GLTFLoader sanitises node names ("pelvis.L" -> "pelvisL").
    const world = (name: string) =>
      gltf.scene.getObjectByName(PropertyBinding.sanitizeNodeName(name))!.getWorldPosition(new Vector3());
    expect(world("head").y).toBeGreaterThan(world("pelvis.L").y + 0.5);
  });
});

describe("MakeHuman morph pack", () => {
  it("has consistent sections and all 288 targets", () => {
    const { manifest, morphBin } = result;
    expect(manifest.targets).toHaveLength(288);
    expect(manifest.sourcePositions.length).toBe(manifest.sourceCount * 12);
    expect(manifest.vertexSource.length).toBe(manifest.vertexCount * 2);
    for (const target of manifest.targets) {
      expect(target.deltaOffset + target.count * 6, target.name).toBeLessThanOrEqual(morphBin.byteLength);
    }
    const names = manifest.targets.map((t) => t.name);
    expect(names).toContain("african-female-young");
    expect(names).toContain("height/male-old-maxmuscle-maxweight-maxheight");
    expect(names).toContain("proportions/female-young-minmuscle-minweight-idealproportions");
  });

  it("indexes only source vertices and resolves every bone and the ground marker", () => {
    const { manifest, morphBin } = result;
    for (const target of manifest.targets.filter((t) => t.count > 0)) {
      const indices = new Uint16Array(morphBin.buffer, morphBin.byteOffset + target.indexOffset, target.count);
      expect(Math.max(...indices), target.name).toBeLessThan(manifest.sourceCount);
    }
    for (const bone of manifest.bones) {
      expect([...bone.head, ...bone.tail].every((v) => v >= 0 && v < manifest.sourceCount), bone.name).toBe(true);
    }
    expect(manifest.ground.length).toBeGreaterThan(0);
  });

  it("moves the body measurably for an ethnic target", () => {
    const { manifest, morphBin } = result;
    const target = manifest.targets.find((t) => t.name === "african-male-young")!;
    const deltas = new Int16Array(morphBin.buffer, morphBin.byteOffset + target.deltaOffset, target.count * 3);
    const largest = Math.max(...Array.from(deltas, (v) => Math.abs(v * manifest.scale)));
    expect(target.count).toBeGreaterThan(1000);
    expect(largest).toBeGreaterThan(0.005);
  });
});
