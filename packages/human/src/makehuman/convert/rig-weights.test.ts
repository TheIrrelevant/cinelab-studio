/**
 * @file rig-weights.test.ts
 * @description Tests rig resolution (strategies, parent-first order, errors) and skin weights.
 * @scope cinelab-studio
 * @depends ./rig-refs.ts, ./skin-weights.ts, ./obj-mesh.ts
 */

import { describe, expect, it } from "vitest";
import { parseObj } from "./obj-mesh.ts";
import { meanPosition, resolveRig, type RigJson } from "./rig-refs.ts";
import { buildSkin } from "./skin-weights.ts";

const obj = parseObj("v 0 0 0\nv 2 0 0\nv 0 2 0\nv 0 0 4\ng joint-root\nf 1 2 3\n");

describe("resolveRig", () => {
  const rig: RigJson = {
    child: { parent: "root", head: { strategy: "VERTEX", vertex_index: 2 }, tail: { strategy: "MEAN", vertex_indices: [2, 3] } },
    root: { head: { strategy: "CUBE", cube_name: "joint-root" }, tail: { strategy: "VERTEX", vertex_index: 2 } },
  };

  it("orders parents first and resolves each strategy to vertex lists", () => {
    const bones = resolveRig(obj, rig);
    expect(bones.map((bone) => bone.name)).toEqual(["root", "child"]);
    expect(bones[0]).toMatchObject({ parent: -1, head: [0, 1, 2], tail: [2] });
    expect(bones[1]).toMatchObject({ parent: 0, head: [2], tail: [2, 3] });
  });

  it("computes joint positions as vertex means", () => {
    expect(meanPosition(obj.positions, [0, 1, 2])).toEqual([2 / 3, 2 / 3, 0]);
  });

  it("rejects unknown parents, cycles and strategies", () => {
    const end = { strategy: "VERTEX", vertex_index: 0 };
    expect(() => resolveRig(obj, { a: { parent: "x", head: end, tail: end } })).toThrow(/unknown parent/);
    expect(() => resolveRig(obj, { a: { parent: "b", head: end, tail: end }, b: { parent: "a", head: end, tail: end } })).toThrow(/cycle/);
    expect(() => resolveRig(obj, { a: { head: { strategy: "ODD" }, tail: end } })).toThrow(/ODD/);
  });
});

describe("buildSkin", () => {
  const weights = {
    weights: {
      a: [[0, 0.1], [1, 1]] as Array<[number, number]>,
      b: [[0, 0.2]] as Array<[number, number]>,
      c: [[0, 0.3]] as Array<[number, number]>,
      d: [[0, 0.4]] as Array<[number, number]>,
      e: [[0, 0.05], [0, 0]] as Array<[number, number]>,
    },
  };

  it("keeps the four strongest bones per vertex, normalised", () => {
    const skin = buildSkin([0, 1, 1], ["a", "b", "c", "d", "e"], weights);
    expect(Array.from(skin.joints.slice(0, 4))).toEqual([3, 2, 1, 0]);
    const sum = skin.weights.slice(0, 4).reduce((total, w) => total + w, 0);
    expect(sum).toBeCloseTo(1);
    expect(skin.weights[0]).toBeCloseTo(0.4);
    // Split copies of source vertex 1 get identical skinning.
    expect(Array.from(skin.joints.slice(4, 8))).toEqual(Array.from(skin.joints.slice(8, 12)));
    expect(skin.unweighted).toBe(0);
  });

  it("binds unweighted vertices fully to bone 0 and counts them", () => {
    const skin = buildSkin([7], ["a"], weights);
    expect(Array.from(skin.weights)).toEqual([1, 0, 0, 0]);
    expect(skin.unweighted).toBe(1);
  });
});
