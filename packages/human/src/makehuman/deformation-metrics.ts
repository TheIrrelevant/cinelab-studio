/**
 * @file deformation-metrics.ts
 * @description Measures skinning deformation of a posed mesh against its rest shape. A triangle
 *   has collapsed when its area drops below 20 % of rest; it is inverted when its normal points
 *   against the rest normal carried by the dominant bone of its first vertex. Problem triangles
 *   are grouped by that dominant bone.
 * @scope cinelab-studio
 * @depends three
 */

import { Vector3, type Object3D, type SkinnedMesh } from "three";

export type DeformationStats = {
  triangles: number;
  collapsed: number;
  inverted: number;
  /** Smallest area ratio over all triangles. */
  worstArea: number;
  /** Problem triangles (collapsed or inverted) per dominant bone name. */
  regions: Record<string, number>;
};

/** Skinned (posed) vertex positions of the mesh on the CPU (linear blend skinning, as rendered). */
export function skinnedPositions(mesh: SkinnedMesh): Float32Array {
  // Bones are not children of the mesh: refresh the whole scene graph first.
  let root: Object3D = mesh;
  while (root.parent) root = root.parent;
  root.updateMatrixWorld(true);
  mesh.skeleton.update();
  const position = mesh.geometry.getAttribute("position");
  const out = new Float32Array(position.count * 3);
  const v = new Vector3();
  for (let i = 0; i < position.count; i += 1) {
    mesh.applyBoneTransform(i, v.fromBufferAttribute(position, i));
    v.toArray(out, i * 3);
  }
  return out;
}

const corner = (p: ArrayLike<number>, i: number, out: Vector3) => out.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);

/** Compares posed triangles with rest triangles; `boneNames` index the skin joints. */
export function deformationStats(mesh: SkinnedMesh, posed: Float32Array, boneNames: readonly string[]): DeformationStats {
  const rest = mesh.geometry.getAttribute("position").array as Float32Array;
  const index = mesh.geometry.getIndex()!.array;
  const joints = mesh.geometry.getAttribute("skinIndex");
  const [a, b, c, e1, e2, n0, n1] = Array.from({ length: 7 }, () => new Vector3());
  const stats: DeformationStats = { triangles: 0, collapsed: 0, inverted: 0, worstArea: Infinity, regions: {} };
  const boneOf = (v: number) => mesh.skeleton.bones[joints.getX(v)];
  for (let t = 0; t < index.length; t += 3) {
    const [i, j, k] = [index[t], index[t + 1], index[t + 2]];
    n0.crossVectors(e1.subVectors(corner(rest, j, b), corner(rest, i, a)), e2.subVectors(corner(rest, k, c), a));
    const restArea = n0.length();
    if (restArea < 1e-10) continue;
    n1.crossVectors(e1.subVectors(corner(posed, j, b), corner(posed, i, a)), e2.subVectors(corner(posed, k, c), a));
    const ratio = n1.length() / restArea;
    stats.triangles += 1;
    stats.worstArea = Math.min(stats.worstArea, ratio);
    // The rest normal rotated with the dominant bone is the expected posed normal.
    const bone = boneOf(i);
    const expected = n0.clone().transformDirection(bone.matrixWorld.clone().multiply(mesh.skeleton.boneInverses[joints.getX(i)]));
    const flipped = n1.dot(expected) < 0;
    if (ratio < 0.2) stats.collapsed += 1;
    if (flipped) stats.inverted += 1;
    if (ratio < 0.2 || flipped) {
      const name = boneNames[joints.getX(i)] ?? bone.name;
      stats.regions[name] = (stats.regions[name] ?? 0) + 1;
    }
  }
  return stats;
}
