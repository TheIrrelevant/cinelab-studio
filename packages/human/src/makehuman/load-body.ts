/**
 * @file load-body.ts
 * @description Loads the generated MakeHuman base GLB, morph pack and proxy pack (see
 *   `pnpm human:build`) and returns the skinned body mesh with its morph and proxy data.
 *   Asset URLs come from the caller.
 * @scope cinelab-studio
 * @depends three, three GLTFLoader, ./morph-data, ./morph-manifest, ./proxy-data, ./proxy-manifest
 */

import type { Group, SkinnedMesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { readMorphData, type MorphData } from "./morph-data";
import type { MorphManifest } from "./morph-manifest";
import { readProxyData, type ProxyData } from "./proxy-data";
import type { ProxyManifest } from "./proxy-manifest";

export type LoadedBody = {
  scene: Group;
  mesh: SkinnedMesh;
  data: MorphData;
  proxies: Map<string, ProxyData>;
  proxyManifest: ProxyManifest;
};

export type BodyFiles = {
  glb: ArrayBuffer;
  manifest: MorphManifest;
  morphs: ArrayBuffer;
  proxyManifest: ProxyManifest;
  proxies: ArrayBuffer;
};

/** File names written by the converter into one folder. */
export const BODY_FILES = {
  glb: "makehuman-base.glb",
  morphs: "makehuman-morphs.bin",
  manifest: "makehuman-morphs.json",
  proxies: "makehuman-proxies.bin",
  proxyManifest: "makehuman-proxies.json",
} as const;

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}: HTTP ${response.status} (run pnpm human:build)`);
  return response;
}

export function parseBody(files: BodyFiles): Promise<LoadedBody> {
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(
      files.glb,
      "",
      (gltf) => {
        let mesh: SkinnedMesh | undefined;
        gltf.scene.traverse((node) => {
          if ((node as SkinnedMesh).isSkinnedMesh) mesh = node as SkinnedMesh;
        });
        if (!mesh) return reject(new Error("MakeHuman GLB has no skinned mesh"));
        resolve({
          scene: gltf.scene,
          mesh,
          data: readMorphData(files.manifest, files.morphs),
          proxies: readProxyData(files.proxyManifest, files.proxies),
          proxyManifest: files.proxyManifest,
        });
      },
      reject,
    );
  });
}

/** @param baseUrl Folder URL ending with "/", e.g. "/human/". */
export async function loadBody(baseUrl: string): Promise<LoadedBody> {
  const buffer = (file: string) => fetchOk(baseUrl + file).then((r) => r.arrayBuffer());
  const json = <T>(file: string) => fetchOk(baseUrl + file).then((r) => r.json() as Promise<T>);
  const [glb, manifest, morphs, proxyManifest, proxies] = await Promise.all([
    buffer(BODY_FILES.glb),
    json<MorphManifest>(BODY_FILES.manifest),
    buffer(BODY_FILES.morphs),
    json<ProxyManifest>(BODY_FILES.proxyManifest),
    buffer(BODY_FILES.proxies),
  ]);
  return parseBody({ glb, manifest, morphs, proxyManifest, proxies });
}
