/**
 * @file obj-mesh.test.ts
 * @description Tests OBJ parsing, group vertex lookup and seam-splitting triangulation.
 * @scope cinelab-studio
 * @depends ./obj-mesh.ts
 */

import { describe, expect, it } from "vitest";
import { buildGroupMesh, groupVertices, parseObj } from "./obj-mesh.ts";

// Two quads sharing edge 2-3; the right quad uses different UVs on that edge (a seam).
const OBJ = `
# comment
v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0
v 2 0 0
v 2 1 0
vt 0 0
vt 1 0
vt 1 1
vt 0 1
vt 0.5 0
vt 0.5 1
g body
f 1/1 2/2 3/3 4/4
f 2/5 5/2 6/3 3/6
g joint-a
f 1/1 2/2 3/3
`;

describe("parseObj", () => {
  it("reads positions, uvs and grouped zero-based faces", () => {
    const obj = parseObj(OBJ);
    expect(obj.positions).toHaveLength(18);
    expect(obj.uvs).toHaveLength(12);
    expect(obj.groups.get("body")).toEqual([
      { v: [0, 1, 2, 3], vt: [0, 1, 2, 3] },
      { v: [1, 4, 5, 2], vt: [4, 1, 2, 5] },
    ]);
    expect(groupVertices(obj, "joint-a")).toEqual([0, 1, 2]);
  });

  it("throws for unknown groups", () => {
    expect(() => groupVertices(parseObj(OBJ), "nope")).toThrow(/nope/);
    expect(() => buildGroupMesh(parseObj(OBJ), "nope")).toThrow(/nope/);
  });
});

describe("buildGroupMesh", () => {
  const mesh = buildGroupMesh(parseObj(OBJ), "body");

  it("splits vertices at UV seams and keeps the source index", () => {
    // 6 positions, but vertices 1 and 2 appear with two UVs each -> 8 render vertices.
    expect(mesh.source.length).toBe(8);
    expect([...mesh.source].filter((v) => v === 1)).toHaveLength(2);
    expect([...mesh.source].filter((v) => v === 2)).toHaveLength(2);
  });

  it("triangulates quads into two triangles each with flipped V", () => {
    expect(mesh.indices).toHaveLength(12);
    expect(Array.from(mesh.indices.slice(0, 6))).toEqual([0, 1, 2, 0, 2, 3]);
    expect(Array.from(mesh.uvs.slice(0, 2))).toEqual([0, 1]);
    expect(Array.from(mesh.uvs.slice(4, 6))).toEqual([1, 0]);
  });
});
