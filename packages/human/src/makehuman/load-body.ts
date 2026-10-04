/**
 * @file load-body.ts
 * @description Loads the generated MakeHuman base GLB and morph pack (see `pnpm human:build`)
 *   and returns the skinned body mesh with its morph data. Asset URLs come from the caller.
 * @scope cinelab-studio
 * @depends three, three GLTFLoader, ./morph-data, ./morph-manifest
 */

import type { Group, SkinnedMesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { readMorphData, type MorphData } from "./morph-data";
import type { MorphManifest } from "./morph-manifest";

export type LoadedBody = { scene: Group; mesh: SkinnedMesh; data: MorphData };

/** File names written by the converter into one folder. */
export const BODY_FILES = {
  glb: "makehuman-base.glb",
  morphs: "makehuman-morphs.bin",
  manifest: "makehuman-morphs.json",
} as const;

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}: HTTP ${response.status} (run pnpm human:build)`);
  return response;
}

export function parseBody(glb: ArrayBuffer, manifest: MorphManifest, morphs: ArrayBuffer): Promise<LoadedBody> {
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(
      glb,
      "",
      (gltf) => {
        let mesh: SkinnedMesh | undefined;
        gltf.scene.traverse((node) => {
          if ((node as SkinnedMesh).isSkinnedMesh) mesh = node as SkinnedMesh;
        });
        if (!mesh) return reject(new Error("MakeHuman GLB has no skinned mesh"));
        resolve({ scene: gltf.scene, mesh, data: readMorphData(manifest, morphs) });
      },
      reject,
    );
  });
}

/** @param baseUrl Folder URL ending with "/", e.g. "/human/". */
export async function loadBody(baseUrl: string): Promise<LoadedBody> {
  const [glb, manifest, morphs] = await Promise.all([
    fetchOk(baseUrl + BODY_FILES.glb).then((r) => r.arrayBuffer()),
    fetchOk(baseUrl + BODY_FILES.manifest).then((r) => r.json() as Promise<MorphManifest>),
    fetchOk(baseUrl + BODY_FILES.morphs).then((r) => r.arrayBuffer()),
  ]);
  return parseBody(glb, manifest, morphs);
}
