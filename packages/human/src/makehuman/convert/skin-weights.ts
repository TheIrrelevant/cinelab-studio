/**
 * @file skin-weights.ts
 * @description Converts MakeHuman per-bone vertex weights into glTF JOINTS_0/WEIGHTS_0: the four
 *   strongest bones per render vertex, normalised to sum 1. Unweighted vertices bind to bone 0.
 *   Dense meshes (plan 2.8) carry the full per-bone weights through the subdivision stencils first.
 * @scope cinelab-studio
 * @depends ../subdivision.ts
 */

import { subdivide, type Subdivision } from "../subdivision.ts";

export type WeightsJson = { weights: Record<string, Array<[number, number]>> };

export type SkinAttributes = {
  joints: Uint16Array;
  weights: Float32Array;
  /** Render vertices that had no weight and were bound fully to bone 0. */
  unweighted: number;
};

/** Bone -> weight map per base OBJ vertex. */
function weightsByVertex(boneNames: string[], json: WeightsJson): Map<number, Map<number, number>> {
  const perVertex = new Map<number, Map<number, number>>();
  boneNames.forEach((bone, boneIndex) => {
    for (const [vertex, weight] of json.weights[bone] ?? []) {
      if (weight <= 0) continue;
      const map = perVertex.get(vertex) ?? new Map<number, number>();
      map.set(boneIndex, weight);
      perVertex.set(vertex, map);
    }
  });
  return perVertex;
}

/** Keeps the four strongest positive weights, normalised; empty input binds to bone 0. */
function writeTop4(entries: Array<[number, number]>, joints: Uint16Array, weights: Float32Array, i: number): boolean {
  const top = entries.filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const total = top.reduce((sum, [, w]) => sum + w, 0);
  if (top.length === 0 || total <= 0) {
    weights[i * 4] = 1;
    return false;
  }
  top.forEach(([bone, w], slot) => {
    joints[i * 4 + slot] = bone;
    weights[i * 4 + slot] = w / total;
  });
  return true;
}

/**
 * Proxy skinning: each fitted vertex blends the bone weights of its three base vertices by its
 * fitting weights; render vertices copy their fitted vertex.
 */
export function buildProxySkin(
  refs: number[][],
  fitWeights: number[][],
  renderFit: ArrayLike<number>,
  boneNames: string[],
  json: WeightsJson,
): SkinAttributes {
  const perVertex = weightsByVertex(boneNames, json);
  const fitted = refs.map((triangle, i) => {
    const blend = new Map<number, number>();
    triangle.forEach((vertex, k) => {
      for (const [bone, w] of perVertex.get(vertex) ?? []) blend.set(bone, (blend.get(bone) ?? 0) + w * fitWeights[i][k]);
    });
    return [...blend];
  });
  const joints = new Uint16Array(renderFit.length * 4);
  const weights = new Float32Array(renderFit.length * 4);
  let unweighted = 0;
  for (let i = 0; i < renderFit.length; i += 1) {
    if (!writeTop4(fitted[renderFit[i]], joints, weights, i)) unweighted += 1;
  }
  return { joints, weights, unweighted };
}

/**
 * @param source OBJ vertex index per render vertex.
 * @param boneNames Bone order of the skin; JOINTS_0 values index into it.
 */
export function buildSkin(source: ArrayLike<number>, boneNames: string[], json: WeightsJson): SkinAttributes {
  const perVertex = weightsByVertex(boneNames, json);
  const joints = new Uint16Array(source.length * 4);
  const weights = new Float32Array(source.length * 4);
  let unweighted = 0;
  for (let i = 0; i < source.length; i += 1) {
    if (!writeTop4([...(perVertex.get(source[i]) ?? [])], joints, weights, i)) unweighted += 1;
  }
  return { joints, weights, unweighted };
}

/**
 * Dense body skinning: every bone weight is subdivided like a position (all stencil weights are
 * positive), then each render vertex keeps the four strongest bones of its dense vertex.
 * @param renderSource Dense vertex per render vertex.
 * @param originals OBJ vertex per compact source index.
 */
export function buildDenseSkin(
  renderSource: ArrayLike<number>,
  sub: Subdivision,
  originals: number[],
  boneNames: string[],
  json: WeightsJson,
): SkinAttributes {
  const perVertex = weightsByVertex(boneNames, json);
  const stride = boneNames.length;
  const coarse = new Float32Array(sub.coarseCount * stride);
  originals.forEach((vertex, i) => {
    for (const [bone, w] of perVertex.get(vertex) ?? []) coarse[i * stride + bone] = w;
  });
  const dense = subdivide(sub, coarse, stride);
  const joints = new Uint16Array(renderSource.length * 4);
  const weights = new Float32Array(renderSource.length * 4);
  let unweighted = 0;
  for (let i = 0; i < renderSource.length; i += 1) {
    const row = renderSource[i] * stride;
    const entries: Array<[number, number]> = [];
    for (let bone = 0; bone < stride; bone += 1) if (dense[row + bone] > 1e-6) entries.push([bone, dense[row + bone]]);
    if (!writeTop4(entries, joints, weights, i)) unweighted += 1;
  }
  return { joints, weights, unweighted };
}
