/**
 * @file subdivision.test.ts
 * @description Catmull-Clark level-1 stencils (known cube values), affine invariance, limit
 *   projection against repeated refinement, and cage validation (plan 2.8).
 * @scope cinelab-studio
 * @depends ./subdivision
 */

import { describe, expect, it } from "vitest";
import { applyStencils, buildSubdivision, subdivide, type Stencils } from "./subdivision";

// Cube [-1, 1]^3, outward winding.
const CUBE_POSITIONS = Float32Array.from([-1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1]);
const CUBE_QUADS = Uint32Array.from([0, 3, 2, 1, 4, 5, 6, 7, 0, 1, 5, 4, 1, 2, 6, 5, 2, 3, 7, 6, 3, 0, 4, 7]);

const at = (p: Float32Array, i: number) => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];

function rowSums(s: Stencils) {
  const sums: number[] = [];
  for (let r = 0; r + 1 < s.offsets.length; r += 1) {
    let sum = 0;
    for (let k = s.offsets[r]; k < s.offsets[r + 1]; k += 1) sum += s.weights[k];
    sums.push(sum);
  }
  return sums;
}

describe("subdivision", () => {
  const sub = buildSubdivision(CUBE_QUADS, 8);

  it("orders dense vertices as vertex, edge and face points", () => {
    expect(sub.denseCount).toBe(26);
    expect(sub.faceBase).toBe(20);
    expect(sub.quads.length).toBe(24 * 4);
  });

  it("matches the textbook Catmull-Clark cube", () => {
    const level1 = applyStencils(sub.level1, CUBE_POSITIONS, 3);
    // Vertex point of corner (1, 1, 1): 5/9 of the way out.
    at(level1, sub.vertexDense[6]).forEach((x) => expect(x).toBeCloseTo(5 / 9, 6));
    const edge = sub.edgeDense.get(2 * 8 + 6)!; // corners (1,1,-1) and (1,1,1)
    expect(at(level1, edge)).toEqual([0.75, 0.75, 0].map((x) => expect.closeTo(x, 6)));
    expect(at(level1, sub.faceBase + 1)).toEqual([0, 0, 1].map((x) => expect.closeTo(x, 6)));
  });

  it("keeps every stencil row affine (weights sum to 1)", () => {
    for (const sum of [...rowSums(sub.level1), ...rowSums(sub.limit)]) expect(sum).toBeCloseTo(1, 6);
  });

  it("projects level-1 vertices onto the limit of repeated refinement", () => {
    const limit = subdivide(sub, CUBE_POSITIONS, 3);
    let quads: Uint32Array = sub.quads;
    let count = sub.denseCount;
    let positions = applyStencils(sub.level1, CUBE_POSITIONS, 3);
    let track = Array.from({ length: sub.denseCount }, (_, v) => v);
    for (let level = 0; level < 5; level += 1) {
      const next = buildSubdivision(quads, count);
      positions = applyStencils(next.level1, positions, 3);
      track = track.map((v) => next.vertexDense[v]);
      quads = next.quads;
      count = next.denseCount;
    }
    // Error shrinks 4x per level (1.5e-4 after five more levels).
    for (let v = 0; v < sub.denseCount; v += 1) {
      at(limit, v).forEach((x, axis) => expect(Math.abs(x - at(positions, track[v])[axis])).toBeLessThan(5e-4));
    }
  });

  it("rejects an open cage", () => {
    expect(() => buildSubdivision(CUBE_QUADS.subarray(0, 20), 8)).toThrow(/closed/);
  });
});
