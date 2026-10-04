/**
 * @file morph-pack.ts
 * @description Packs sparse MakeHuman targets into one binary for runtime CPU morphing: per
 *   target a Uint16 list of source-vertex indices and Int16 xyz deltas sharing one global scale.
 *   Entries for vertices outside the source set (unused helpers) are dropped.
 * @scope cinelab-studio
 * @depends ./binary-builder.ts, ../target-file.ts, ../morph-manifest.ts
 */

import type { BinaryBuilder } from "./binary-builder.ts";
import type { TargetOffsets } from "../target-file.ts";
import type { PackedTarget } from "../morph-manifest.ts";

export type NamedTarget = { name: string; target: TargetOffsets };

/**
 * @param compact Source index per OBJ vertex, or -1 when the vertex is not in the source set.
 * @param unit Factor from MakeHuman units to metres (0.1).
 */
export function packMorphs(targets: NamedTarget[], compact: Int32Array, unit: number, out: BinaryBuilder) {
  let maxAbs = 0;
  for (const { target } of targets) {
    for (let i = 0; i < target.indices.length; i += 1) {
      if (compact[target.indices[i]] < 0) continue;
      for (let axis = 0; axis < 3; axis += 1) maxAbs = Math.max(maxAbs, Math.abs(target.offsets[i * 3 + axis] * unit));
    }
  }
  const scale = maxAbs > 0 ? maxAbs / 32767 : 1;
  const packed: PackedTarget[] = targets.map(({ name, target }) => {
    const indices: number[] = [];
    const deltas: number[] = [];
    for (let i = 0; i < target.indices.length; i += 1) {
      const sourceIndex = compact[target.indices[i]];
      if (sourceIndex < 0) continue;
      indices.push(sourceIndex);
      for (let axis = 0; axis < 3; axis += 1) deltas.push(Math.round((target.offsets[i * 3 + axis] * unit) / scale));
    }
    const index = out.append(Uint16Array.from(indices));
    const delta = out.append(Int16Array.from(deltas));
    return { name, count: indices.length, indexOffset: index.offset, deltaOffset: delta.offset };
  });
  return { scale, targets: packed };
}
