/**
 * @file morph-data.ts
 * @description Runtime reader for the MakeHuman morph pack (plus the optional modifier pack) and
 *   CPU morphing: base source positions + sum(weight * delta * pack scale), regrounded so the
 *   ground marker sits at y = 0.
 * @scope cinelab-studio
 * @depends ./morph-manifest, ./modifier-catalogue
 */

import type { Modifier } from "./modifier-catalogue";
import type { ModifierManifest, MorphManifest, PackedTarget } from "./morph-manifest";

/** `scale` converts the Int16 deltas of this target's pack to metres. */
export type MorphTarget = { indices: Uint16Array; deltas: Int16Array; scale: number };

export type MorphData = {
  manifest: MorphManifest;
  basePositions: Float32Array;
  vertexSource: Uint16Array;
  targets: Map<string, MorphTarget>;
  /** Modifier pack contents once added (plan 2.2). */
  modifiers?: { catalogue: Modifier[]; breastMacros: string[] };
};

function readTargets(packed: PackedTarget[], buffer: ArrayBuffer, scale: number, into: Map<string, MorphTarget>) {
  for (const target of packed) {
    into.set(target.name, {
      indices: new Uint16Array(buffer, target.indexOffset, target.count),
      deltas: new Int16Array(buffer, target.deltaOffset, target.count * 3),
      scale,
    });
  }
}

export function readMorphData(manifest: MorphManifest, buffer: ArrayBuffer): MorphData {
  if (manifest.version !== 1) throw new Error(`Unsupported morph pack version ${manifest.version}`);
  const targets = new Map<string, MorphTarget>();
  readTargets(manifest.targets, buffer, manifest.scale, targets);
  return {
    manifest,
    basePositions: new Float32Array(buffer, manifest.sourcePositions.offset, manifest.sourceCount * 3),
    vertexSource: new Uint16Array(buffer, manifest.vertexSource.offset, manifest.vertexCount),
    targets,
  };
}

/** Adds the modifier pack's targets (same source indexing) and catalogue to the morph data. */
export function addModifierPack(data: MorphData, manifest: ModifierManifest, buffer: ArrayBuffer): void {
  if (manifest.version !== 1 || manifest.sourceCount !== data.manifest.sourceCount) throw new Error("Modifier pack does not match the morph pack");
  readTargets(manifest.targets, buffer, manifest.scale, data.targets);
  data.modifiers = { catalogue: manifest.catalogue, breastMacros: manifest.breastMacros };
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
  for (const [name, weight] of weights) {
    const target = data.targets.get(name);
    if (!target) throw new Error(`Morph target missing from pack: ${name}`);
    const factor = weight * target.scale;
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
