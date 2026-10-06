/**
 * @file skin-detail.ts
 * @description Skin polish helpers (plan 2.7), pure functions on RGBA pixel arrays so they run in
 *   tests and in the browser compositor:
 *   - `flattenLowFrequency`: the MakeHuman stock skins paint a lighter patch on the face that shows
 *     as a soft band across one cheek. Inside the face UV island the broad brightness is pulled
 *     towards the island mean (pixel + strength * (mean - blurred)), keeping fine detail (pores,
 *     lips, brows) which lives above the blur radius.
 *   - `detailNormalPixels`: a tileable micro-normal map (value noise) that breaks up the flat
 *     specular of the skin.
 * @scope cinelab-studio
 * @depends none
 */

/** Face island of the MakeHuman hm08 UV layout (fractions of the texture). */
export const FACE_REGION = { x0: 0.63, x1: 1, y0: 0.16, y1: 0.82 } as const;

/** Box blur of one channel (separable, `radius` pixels, edges clamped). */
function boxBlur(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const pass = (from: Float32Array, to: Float32Array, horizontal: boolean) => {
    const lines = horizontal ? height : width;
    const length = horizontal ? width : height;
    for (let line = 0; line < lines; line += 1) {
      const at = (i: number) => (horizontal ? line * width + i : i * width + line);
      let sum = 0;
      for (let i = -radius; i <= radius; i += 1) sum += from[at(Math.min(length - 1, Math.max(0, i)))];
      for (let i = 0; i < length; i += 1) {
        to[at(i)] = sum / (2 * radius + 1);
        sum += from[at(Math.min(length - 1, i + radius + 1))] - from[at(Math.max(0, i - radius))];
      }
    }
  };
  pass(src, tmp, true);
  pass(tmp, out, false);
  return out;
}

/**
 * Pulls broad brightness inside the region (a width x height RGBA block) towards its mean.
 * `radius` is the blur radius in pixels; `strength` 0..1. Works in place and returns the pixels.
 */
export function flattenLowFrequency(pixels: Uint8ClampedArray, width: number, height: number, radius: number, strength: number): Uint8ClampedArray {
  for (let c = 0; c < 3; c += 1) {
    const channel = new Float32Array(width * height);
    let mean = 0;
    for (let i = 0; i < channel.length; i += 1) {
      channel[i] = pixels[i * 4 + c];
      mean += channel[i];
    }
    mean /= channel.length;
    const blurred = boxBlur(boxBlur(channel, width, height, radius), width, height, radius);
    for (let i = 0; i < channel.length; i += 1) pixels[i * 4 + c] = channel[i] + strength * (mean - blurred[i]);
  }
  return pixels;
}

/** Tileable value noise in 0..1 on a `size` grid with `cells` cells per side. */
function valueNoise(size: number, cells: number, seed: number): Float32Array {
  const lattice = new Float32Array(cells * cells);
  let state = seed >>> 0;
  for (let i = 0; i < lattice.length; i += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    lattice[i] = state / 4294967296;
  }
  const out = new Float32Array(size * size);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const fx = (x / size) * cells;
      const fy = (y / size) * cells;
      const [x0, y0] = [Math.floor(fx), Math.floor(fy)];
      const [tx, ty] = [smooth(fx - x0), smooth(fy - y0)];
      const v = (i: number, j: number) => lattice[(j % cells) * cells + (i % cells)];
      const top = v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx;
      const bottom = v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx;
      out[y * size + x] = top * (1 - ty) + bottom * ty;
    }
  }
  return out;
}

/** RGBA tangent-space normal map from two octaves of tileable value noise (flat = 128,128,255). */
export function detailNormalPixels(size = 256, seed = 7): Uint8Array {
  const a = valueNoise(size, 32, seed);
  const b = valueNoise(size, 64, seed + 1);
  const height = a.map((v, i) => v * 0.65 + b[i] * 0.35);
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const h = (i: number, j: number) => height[((j + size) % size) * size + ((i + size) % size)];
      const dx = (h(x + 1, y) - h(x - 1, y)) * 4;
      const dy = (h(x, y + 1) - h(x, y - 1)) * 4;
      const length = Math.hypot(dx, dy, 1);
      const p = (y * size + x) * 4;
      out[p] = Math.round(((-dx / length) * 0.5 + 0.5) * 255);
      out[p + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255);
      out[p + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255);
      out[p + 3] = 255;
    }
  }
  return out;
}
