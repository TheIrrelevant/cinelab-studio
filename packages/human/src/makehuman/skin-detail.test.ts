/**
 * @file skin-detail.test.ts
 * @description Plan 2.7 skin helpers: low-frequency flattening removes a broad brightness band but
 *   keeps fine detail and the mean; the detail normal map is unit length, tileable and flat on
 *   average.
 * @scope cinelab-studio
 * @depends ./skin-detail
 */

import { describe, expect, it } from "vitest";
import { detailNormalPixels, flattenLowFrequency } from "./skin-detail";

/** Grey RGBA block: a soft vertical band (low frequency) plus a 2-pixel checker (fine detail). */
function block(width: number, height: number) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const band = 40 * Math.exp(-(((x - width / 2) / (width / 6)) ** 2));
      const fine = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? 6 : -6;
      const p = (y * width + x) * 4;
      pixels.fill(Math.round(150 + band + fine), p, p + 3);
      pixels[p + 3] = 255;
    }
  }
  return pixels;
}
const column = (pixels: Uint8ClampedArray, width: number, height: number, x: number) => {
  let sum = 0;
  for (let y = 0; y < height; y += 1) sum += pixels[(y * width + x) * 4];
  return sum / height;
};

describe("skin detail (plan 2.7)", () => {
  it("flattens a broad band, keeps fine detail and the mean", () => {
    const [w, h] = [120, 60];
    const before = block(w, h);
    const after = flattenLowFrequency(block(w, h), w, h, 8, 1);
    const bandBefore = column(before, w, h, w / 2) - column(before, w, h, 4);
    const bandAfter = column(after, w, h, w / 2) - column(after, w, h, 4);
    expect(bandBefore).toBeGreaterThan(35);
    expect(Math.abs(bandAfter)).toBeLessThan(bandBefore * 0.35);
    const fine = (p: Uint8ClampedArray, x: number, y: number) => p[(y * w + x) * 4] - p[(y * w + x + 2) * 4];
    expect(Math.abs(fine(after, 30, 30))).toBeGreaterThan(8);
    const mean = (p: Uint8ClampedArray) => p.reduce((s, v, i) => (i % 4 === 0 ? s + v : s), 0) / (w * h);
    expect(Math.abs(mean(after) - mean(before))).toBeLessThan(2);
  });

  it("makes a unit-length, tileable, on-average flat detail normal map", () => {
    const size = 256; // runtime size
    const pixels = detailNormalPixels(size, 3);
    let [sx, sy] = [0, 0];
    for (let i = 0; i < size * size; i += 1) {
      const [x, y, z] = [0, 1, 2].map((c) => pixels[i * 4 + c] / 127.5 - 1);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 1);
      expect(z).toBeGreaterThan(0.5);
      sx += x;
      sy += y;
    }
    expect(Math.abs(sx / (size * size))).toBeLessThan(0.02);
    expect(Math.abs(sy / (size * size))).toBeLessThan(0.02);
    const edge = (x: number, y: number) => pixels[(y * size + x) * 4 + 2];
    for (let y = 0; y < size; y += 16) expect(Math.abs(edge(0, y) - edge(size - 1, y))).toBeLessThan(25);
  });
});
