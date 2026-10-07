/**
 * @file dense-mesh.ts
 * @description Converter side of the denser topology (plan 2.8): the body cage as quads in compact
 *   source indexing, and the level-1 render mesh with face-varying linear UVs, split at UV seams.
 * @scope cinelab-studio
 * @depends ./obj-mesh.ts, ../subdivision.ts
 */

import type { GroupMesh, ObjData } from "./obj-mesh.ts";
import { edgeKey, type Subdivision } from "../subdivision.ts";

/** Quads of a group in compact source indexing (4 per quad). */
export function cageQuads(obj: ObjData, group: string, compact: Int32Array): Uint32Array {
  const faces = obj.groups.get(group);
  if (!faces) throw new Error(`OBJ group not found: ${group}`);
  const quads = new Uint32Array(faces.length * 4);
  faces.forEach((face, f) => {
    if (face.v.length !== 4) throw new Error(`${group} face ${f} is not a quad`);
    face.v.forEach((v, k) => (quads[f * 4 + k] = compact[v]));
  });
  return quads;
}

/**
 * Level-1 render mesh of a group: `source[i]` is the dense vertex of render vertex i. Each cage quad
 * splits into four quads (corner, edge point, face point, previous edge point), two triangles each.
 */
export function buildDenseMesh(obj: ObjData, group: string, compact: Int32Array, sub: Subdivision): GroupMesh {
  const faces = obj.groups.get(group)!;
  const keyToVertex = new Map<string, number>();
  const source: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const vertexFor = (dense: number, key: string, u: number, v: number) => {
    let index = keyToVertex.get(key);
    if (index === undefined) {
      index = source.length;
      keyToVertex.set(key, index);
      source.push(dense);
      uvs.push(u, v);
    }
    return index;
  };
  faces.forEach((face, f) => {
    // glTF puts the UV origin top-left; OBJ puts it bottom-left.
    const uv = face.vt.map((vt) => (vt >= 0 ? [obj.uvs[vt * 2], 1 - obj.uvs[vt * 2 + 1]] : [0, 0]));
    const cornerAt = (k: number) => {
      const dense = sub.vertexDense[compact[face.v[k]]];
      return vertexFor(dense, `v${dense}/${face.vt[k]}`, uv[k][0], uv[k][1]);
    };
    const edgeAt = (k: number) => {
      const j = (k + 1) & 3;
      const dense = sub.edgeDense.get(edgeKey(compact[face.v[k]], compact[face.v[j]], sub.coarseCount))!;
      const [t0, t1] = [face.vt[k], face.vt[j]].sort((a, b) => a - b);
      return vertexFor(dense, `e${dense}/${t0},${t1}`, (uv[k][0] + uv[j][0]) / 2, (uv[k][1] + uv[j][1]) / 2);
    };
    const centre = uv.reduce((sum, [u, v]) => [sum[0] + u / 4, sum[1] + v / 4], [0, 0]);
    const facePoint = vertexFor(sub.faceBase + f, `f${f}`, centre[0], centre[1]);
    const corners = [0, 1, 2, 3].map(cornerAt);
    const edges = [0, 1, 2, 3].map(edgeAt);
    for (let k = 0; k < 4; k += 1) {
      const quad = [corners[k], edges[k], facePoint, edges[(k + 3) & 3]];
      indices.push(quad[0], quad[1], quad[2], quad[0], quad[2], quad[3]);
    }
  });
  return { source: Uint32Array.from(source), uvs: Float32Array.from(uvs), indices: Uint32Array.from(indices) };
}
