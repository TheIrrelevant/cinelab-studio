/**
 * @file proxy-data.ts
 * @description Runtime proxies: reads the proxy pack, builds a SkinnedMesh per proxy that shares
 *   the body skeleton, and re-fits its vertices and normals to morphed body source positions.
 * @scope cinelab-studio
 * @depends three, ./proxy-fit, ./proxy-manifest, ./normals
 */

import { BufferAttribute, BufferGeometry, type Material, SkinnedMesh, type Skeleton } from "three";
import { seamlessNormals } from "./normals";
import { fitProxy, type ProxyFit } from "./proxy-fit";
import type { PackedProxy, ProxyManifest } from "./proxy-manifest";

export type ProxyData = {
  info: PackedProxy;
  fit: ProxyFit;
  renderFit: Uint32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  joints: Uint16Array;
  skinWeights: Float32Array;
};

export function readProxyData(manifest: ProxyManifest, buffer: ArrayBuffer): Map<string, ProxyData> {
  if (manifest.version !== 1) throw new Error(`Unsupported proxy pack version ${manifest.version}`);
  const view = <T>(Type: { new (b: ArrayBuffer, o: number, n: number): T; BYTES_PER_ELEMENT: number }, s: { offset: number; length: number }) =>
    new Type(buffer, s.offset, s.length / Type.BYTES_PER_ELEMENT);
  const proxies = new Map<string, ProxyData>();
  for (const info of manifest.proxies) {
    proxies.set(proxyKey(info.kind, info.name), {
      info,
      fit: { refs: view(Uint16Array, info.refs), weights: view(Float32Array, info.weights), offsets: view(Float32Array, info.offsets), scaleRefs: info.scaleRefs },
      renderFit: view(Uint32Array, info.renderFit),
      uvs: view(Float32Array, info.uvs),
      indices: view(Uint32Array, info.indices),
      joints: view(Uint16Array, info.joints),
      skinWeights: view(Float32Array, info.skinWeights),
    });
  }
  return proxies;
}

export const proxyKey = (kind: string, name: string) => `${kind}/${name}`;

/** Skinned mesh bound to the body skeleton with the body's bind matrix. */
export function createProxyMesh(data: ProxyData, skeleton: Skeleton, bindMatrix: SkinnedMesh["bindMatrix"], material: Material): SkinnedMesh {
  const geometry = new BufferGeometry();
  const count = data.info.vertexCount;
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("uv", new BufferAttribute(data.uvs, 2));
  geometry.setAttribute("skinIndex", new BufferAttribute(data.joints, 4));
  geometry.setAttribute("skinWeight", new BufferAttribute(data.skinWeights, 4));
  geometry.setIndex(new BufferAttribute(data.indices, 1));
  const mesh = new SkinnedMesh(geometry, material);
  mesh.name = proxyKey(data.info.kind, data.info.name);
  mesh.bind(skeleton, bindMatrix);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

/** Re-fits a proxy mesh to body source positions (metres, grounded). */
export function fitProxyMesh(mesh: SkinnedMesh, data: ProxyData, source: Float32Array) {
  const fitted = fitProxy(source, data.fit);
  const position = mesh.geometry.getAttribute("position") as BufferAttribute;
  const positions = position.array as Float32Array;
  for (let i = 0; i < data.renderFit.length; i += 1) {
    const f = data.renderFit[i] * 3;
    positions[i * 3] = fitted[f];
    positions[i * 3 + 1] = fitted[f + 1];
    positions[i * 3 + 2] = fitted[f + 2];
  }
  const normal = mesh.geometry.getAttribute("normal") as BufferAttribute;
  seamlessNormals(positions, data.indices, data.renderFit, data.info.fitCount, normal.array as Float32Array);
  position.needsUpdate = true;
  normal.needsUpdate = true;
  mesh.geometry.computeBoundingSphere();
}
