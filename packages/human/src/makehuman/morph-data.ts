/**
 * @file morph-data.ts
 * @description Runtime reader for the MakeHuman morph pack and CPU morphing: base source
 *   positions + sum(weight * delta), regrounded so the ground marker sits at y = 0.
 * @scope cinelab-studio
 * @depends ./morph-manifest
 */

import type { MorphManifest } from "./morph-manifest";

export type MorphTarget = { indices: Uint16Array; deltas: Int16Array };

export type MorphData = {
  manifest: MorphManifest;
  basePositions: Float32Array;
  vertexSource: Uint16Array;
  targets: Map<string, MorphTarget>;
};

export function readMorphData(manifest: MorphManifest, buffer: ArrayBuffer): MorphData {
  if (manifest.version !== 1) throw new Error(`Unsupported morph pack version ${manifest.version}`);
  const targets = new Map<string, MorphTarget>();
  for (const target of manifest.targets) {
    targets.set(target.name, {
      indices: new Uint16Array(buffer, target.indexOffset, target.count),
      deltas: new Int16Array(buffer, target.deltaOffset, target.count * 3),
    });
  }
  return {
    manifest,
    basePositions: new Float32Array(buffer, manifest.sourcePositions.offset, manifest.sourceCount * 3),
    vertexSource: new Uint16Array(buffer, manifest.vertexSource.offset, manifest.vertexCount),
    targets,
  };
}

/**
 * Morphed, grounded source positions. Weights for names missing from the pack throw, so a
 * mismatch between macro naming and the converter output cannot fail silently.
 */
export function morphSourcePositions(
  data: MorphData,
  weights: Map<string, number>,
  out: Float32Array = new Float32Array(data.basePositions.length),
): Float32Array {
  out.set(data.basePositions);
  const scale = data.manifest.scale;
  for (const [name, weight] of weights) {
    const target = data.targets.get(name);
    if (!target) throw new Error(`Morph target missing from pack: ${name}`);
    const factor = weight * scale;
    const { indices, deltas } = target;
    for (let i = 0; i < indices.length; i += 1) {
      const p = indices[i] * 3;
      out[p] += deltas[i * 3] * factor;
      out[p + 1] += deltas[i * 3 + 1] * factor;
      out[p + 2] += deltas[i * 3 + 2] * factor;
    }
  }
  let groundY = 0;
  for (const v of data.manifest.ground) groundY += out[v * 3 + 1];
  groundY /= data.manifest.ground.length;
  for (let p = 1; p < out.length; p += 3) out[p] -= groundY;
  return out;
}

/** Mean position of source vertices (a bone joint). */
export function jointPosition(positions: Float32Array, vertices: number[]): [number, number, number] {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const v of vertices) {
    x += positions[v * 3];
    y += positions[v * 3 + 1];
    z += positions[v * 3 + 2];
  }
  return [x / vertices.length, y / vertices.length, z / vertices.length];
}
