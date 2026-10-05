/**
 * @file build.test.ts
 * @description End-to-end conversion of the vendored MakeHuman assets: the GLB loads in three's
 *   GLTFLoader as a skinned, grounded, adult-sized body, the morph pack is consistent, and the
 *   modifier pack holds every catalogue target within its size budget.
 * @scope cinelab-studio
 * @depends ../../../scripts/build-assets.ts, ./build.ts, three GLTFLoader
 */

import { beforeAll, describe, expect, it } from "vitest";
import { Box3, PropertyBinding, Vector3, type SkinnedMesh } from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { gzipSync } from "node:zlib";
import { buildAssets } from "../../../scripts/build-assets.ts";
import { catalogueTargets } from "../modifier-catalogue";

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
  it("has consistent sections and all 192 targets", () => {
    const { manifest, morphBin } = result;
    expect(manifest.targets).toHaveLength(192);
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

describe("modifier pack (plan 2.1)", () => {
  it("packs every catalogue target and the 144 breast macros", () => {
    const modifiers = result.modifiers!;
    const packed = new Set(modifiers.manifest.targets.map((t) => t.name));
    expect(modifiers.manifest.catalogue).toHaveLength(200);
    expect(modifiers.manifest.breastMacros).toHaveLength(144);
    for (const name of [...catalogueTargets(modifiers.manifest.catalogue), ...modifiers.manifest.breastMacros]) expect(packed.has(name), name).toBe(true);
    expect(modifiers.manifest.sourceCount).toBe(result.manifest.sourceCount);
  });

  it("moves real vertices and stays inside the download budget", () => {
    const modifiers = result.modifiers!;
    expect(modifiers.manifest.targets.every((t) => t.count > 0)).toBe(true);
    // Budget (docs in packages/human/AGENTS.md): 6 MB raw, 1.6 MB gzip.
    expect(modifiers.bin.byteLength).toBeLessThan(6e6);
    expect(gzipSync(modifiers.bin).byteLength).toBeLessThan(1.6e6);
  });
});

