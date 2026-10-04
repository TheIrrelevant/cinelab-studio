/**
 * @file pack-normals.test.ts
 * @description Tests the binary builder, morph packing (drop, quantise, round-trip) and
 *   seam-free normals.
 * @scope cinelab-studio
 * @depends ./binary-builder.ts, ./morph-pack.ts, ../normals.ts, ../target-file.ts
 */

import { describe, expect, it } from "vitest";
import { seamlessNormals } from "../normals.ts";
import { parseTarget } from "../target-file.ts";
import { BinaryBuilder } from "./binary-builder.ts";
import { packMorphs } from "./morph-pack.ts";

describe("BinaryBuilder", () => {
  it("aligns every section to 4 bytes", () => {
    const builder = new BinaryBuilder();
    expect(builder.append(Uint8Array.of(1, 2, 3))).toEqual({ offset: 0, length: 3 });
    expect(builder.append(Uint16Array.of(9))).toEqual({ offset: 4, length: 2 });
    expect(builder.byteLength).toBe(8);
    expect(Array.from(builder.toBytes())).toEqual([1, 2, 3, 0, 9, 0, 0, 0]);
  });
});

describe("packMorphs", () => {
  const compact = Int32Array.from([0, -1, 1]);
  const targets = [
    { name: "a", target: parseTarget("0 10 0 -5\n1 99 99 99\n2 0 2.5 0") },
    { name: "b", target: parseTarget("2 1 1 1") },
  ];

  it("drops vertices outside the source set and round-trips deltas in metres", () => {
    const builder = new BinaryBuilder();
    const { scale, targets: packed } = packMorphs(targets, compact, 0.1, builder);
    expect(packed.map((t) => [t.name, t.count])).toEqual([["a", 2], ["b", 1]]);
    expect(scale).toBeCloseTo(1 / 32767);
    const bytes = builder.toBytes();
    const indices = new Uint16Array(bytes.buffer, packed[0].indexOffset, 2);
    const deltas = new Int16Array(bytes.buffer, packed[0].deltaOffset, 6);
    expect(Array.from(indices)).toEqual([0, 1]);
    const metres = Array.from(deltas, (value) => value * scale);
    [1, 0, -0.5, 0, 0.25, 0].forEach((expected, i) => expect(metres[i]).toBeCloseTo(expected, 4));
  });
});

describe("seamlessNormals", () => {
  it("gives split copies of a vertex the same normal across a fold", () => {
    // Two triangles folded along edge (0,1); render vertices 2 and 3 are seam copies of source 1.
    const positions = Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1]);
    const indices = [0, 1, 2, 0, 4, 3];
    const source = [0, 1, 2, 1, 3];
    const normals = seamlessNormals(positions, indices, source, 4);
    expect(Array.from(normals.slice(3, 6))).toEqual(Array.from(normals.slice(9, 12)));
    expect(Math.hypot(normals[3], normals[4], normals[5])).toBeCloseTo(1);
    expect(Array.from(normals.slice(6, 9)).map((v) => Math.round(v))).toEqual([0, 0, 1]);
  });
});
