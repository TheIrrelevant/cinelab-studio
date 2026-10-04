/**
 * @file proxy-fit.ts
 * @description Places proxy vertices (hair, eyes, eyebrows, eyelashes) on a body: each vertex is
 *   a weighted sum of three body source vertices plus an offset scaled per axis by the body's
 *   current size along that axis. Used by the converter tests and at runtime after morphing.
 * @scope cinelab-studio
 * @depends none
 */

export type ProxyFit = {
  /** 3 source vertex indices per proxy vertex. */
  refs: ArrayLike<number>;
  /** 3 weights per proxy vertex. */
  weights: ArrayLike<number>;
  /** xyz offset per proxy vertex, in metres at reference scale. */
  offsets: ArrayLike<number>;
  /** [a, b, referenceLengthMetres] for x, y and z. */
  scaleRefs: ArrayLike<number>;
};

/** Per-axis scale: current |p[a] - p[b]| along the axis divided by the reference length. */
export function axisScales(source: ArrayLike<number>, scaleRefs: ArrayLike<number>): [number, number, number] {
  const scales: [number, number, number] = [1, 1, 1];
  for (let axis = 0; axis < 3; axis += 1) {
    const a = scaleRefs[axis * 3];
    const b = scaleRefs[axis * 3 + 1];
    const length = scaleRefs[axis * 3 + 2];
    scales[axis] = Math.abs(source[a * 3 + axis] - source[b * 3 + axis]) / length;
  }
  return scales;
}

/** Proxy vertex positions (xyz per proxy vertex) for the given body source positions. */
export function fitProxy(source: ArrayLike<number>, fit: ProxyFit, out?: Float32Array): Float32Array {
  const count = fit.weights.length / 3;
  const result = out ?? new Float32Array(count * 3);
  const scales = axisScales(source, fit.scaleRefs);
  for (let i = 0; i < count; i += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      let value = fit.offsets[i * 3 + axis] * scales[axis];
      for (let k = 0; k < 3; k += 1) value += fit.weights[i * 3 + k] * source[fit.refs[i * 3 + k] * 3 + axis];
      result[i * 3 + axis] = value;
    }
  }
  return result;
}
