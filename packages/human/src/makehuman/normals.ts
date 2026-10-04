/**
 * @file normals.ts
 * @description Smooth vertex normals that ignore UV seams: face normals are summed per source
 *   (OBJ) vertex, so split copies of one vertex share a normal. Used by the GLB converter and
 *   again at runtime after morphing.
 * @scope cinelab-studio
 * @depends none
 */

/**
 * @param positions xyz per render vertex.
 * @param indices Triangle indices into render vertices.
 * @param source Source vertex per render vertex (render vertices with equal source share a normal).
 * @param sourceCount Number of distinct source vertices (max(source) + 1 or more).
 */
export function seamlessNormals(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  source: ArrayLike<number>,
  sourceCount: number,
  out: Float32Array = new Float32Array(source.length * 3),
): Float32Array {
  const sums = new Float32Array(sourceCount * 3);
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t] * 3;
    const b = indices[t + 1] * 3;
    const c = indices[t + 2] * 3;
    const ux = positions[b] - positions[a];
    const uy = positions[b + 1] - positions[a + 1];
    const uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a];
    const vy = positions[c + 1] - positions[a + 1];
    const vz = positions[c + 2] - positions[a + 2];
    // Area-weighted face normal (cross product, not normalised).
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const corner of [indices[t], indices[t + 1], indices[t + 2]]) {
      const s = source[corner] * 3;
      sums[s] += nx;
      sums[s + 1] += ny;
      sums[s + 2] += nz;
    }
  }
  for (let i = 0; i < source.length; i += 1) {
    const s = source[i] * 3;
    const length = Math.hypot(sums[s], sums[s + 1], sums[s + 2]) || 1;
    out[i * 3] = sums[s] / length;
    out[i * 3 + 1] = sums[s + 1] / length;
    out[i * 3 + 2] = sums[s + 2] / length;
  }
  return out;
}
