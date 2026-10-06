/**
 * @file mesh-slice.test.ts
 * @description Plan 2.3 cross-sections on synthetic closed meshes: a box cut gives one square loop,
 *   two separate boxes give two loops, a concave L-prism girth is its convex hull.
 * @scope cinelab-studio
 * @depends ./mesh-slice
 */

import { describe, expect, it } from "vitest";
import { hullPerimeter, loopArea, sliceLoops } from "./mesh-slice";

/** Closed prism over a counter-clockwise XZ polygon, from y = 0 to y = 1, offset by `dx`. */
function prism(polygon: Array<[number, number]>, dx = 0, first = 0) {
  const n = polygon.length;
  const positions: number[] = [];
  for (const y of [0, 1]) for (const [x, z] of polygon) positions.push(x + dx, y, z);
  const tris: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    tris.push(first + i, first + j, first + n + j, first + i, first + n + j, first + n + i);
  }
  for (let i = 1; i < n - 1; i += 1) tris.push(first, first + i + 1, first + i, first + n, first + n + i, first + n + i + 1);
  return { positions, tris };
}

const square: Array<[number, number]> = [[0, 0], [1, 0], [1, 1], [0, 1]];

describe("mesh slices (plan 2.3)", () => {
  it("cuts a box into one square loop", () => {
    const { positions, tris } = prism(square);
    const loops = sliceLoops(Float32Array.from(positions), Uint32Array.from(tris), 0.5);
    expect(loops).toHaveLength(1);
    expect(loopArea(loops[0])).toBeCloseTo(1, 6);
    expect(hullPerimeter(loops[0])).toBeCloseTo(4, 6);
  });

  it("keeps separate bodies as separate loops", () => {
    const a = prism(square);
    const b = prism(square, 3, 8);
    const loops = sliceLoops(Float32Array.from([...a.positions, ...b.positions]), Uint32Array.from([...a.tris, ...b.tris]), 0.3);
    expect(loops).toHaveLength(2);
  });

  it("measures girth as a tape would (convex hull of a concave loop)", () => {
    const shape: Array<[number, number]> = [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]];
    const { positions, tris } = prism(shape);
    const [loop] = sliceLoops(Float32Array.from(positions), Uint32Array.from(tris), 0.5);
    expect(loopArea(loop)).toBeCloseTo(3, 6);
    expect(hullPerimeter(loop)).toBeCloseTo(6 + Math.SQRT2, 6);
  });
});
