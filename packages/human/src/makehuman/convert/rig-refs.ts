/**
 * @file rig-refs.ts
 * @description Resolves a MakeHuman rig JSON into parent-first bones whose head and tail are
 *   vertex index lists (CUBE = joint cube vertices, VERTEX = one vertex, MEAN = several).
 *   A joint position is the mean of its vertices, so it follows any body morph.
 * @scope cinelab-studio
 * @depends ./obj-mesh.ts
 */

import { groupVertices, type ObjData } from "./obj-mesh.ts";

type RigEnd = { strategy: string; cube_name?: string; vertex_index?: number; vertex_indices?: number[] };
export type RigJson = Record<string, { parent?: string; head: RigEnd; tail: RigEnd; roll?: number }>;

/** `roll` is the Blender bone roll in radians (Z-up frame). */
export type BoneRef = { name: string; parent: number; head: number[]; tail: number[]; roll: number };

function resolveEnd(obj: ObjData, bone: string, end: RigEnd): number[] {
  if (end.strategy === "CUBE" && end.cube_name) return groupVertices(obj, end.cube_name);
  if (end.strategy === "VERTEX" && end.vertex_index !== undefined) return [end.vertex_index];
  if (end.strategy === "MEAN" && end.vertex_indices?.length) return [...end.vertex_indices];
  throw new Error(`Unsupported rig strategy for ${bone}: ${end.strategy}`);
}

/** Bones ordered so every parent precedes its children; `parent` is an index or -1. */
export function resolveRig(obj: ObjData, rig: RigJson): BoneRef[] {
  const ordered: string[] = [];
  const visit = (name: string, trail: Set<string>) => {
    if (ordered.includes(name)) return;
    if (trail.has(name)) throw new Error(`Rig cycle at ${name}`);
    const parent = rig[name].parent;
    if (parent) {
      if (!rig[parent]) throw new Error(`Bone ${name} has unknown parent ${parent}`);
      visit(parent, new Set(trail).add(name));
    }
    ordered.push(name);
  };
  for (const name of Object.keys(rig)) visit(name, new Set());
  return ordered.map((name) => ({
    name,
    parent: rig[name].parent ? ordered.indexOf(rig[name].parent as string) : -1,
    head: resolveEnd(obj, name, rig[name].head),
    tail: resolveEnd(obj, name, rig[name].tail),
    roll: rig[name].roll ?? 0,
  }));
}

/** Mean xyz of the given vertex indices in a flat position array. */
export function meanPosition(positions: ArrayLike<number>, vertices: number[]): [number, number, number] {
  const sum = [0, 0, 0];
  for (const v of vertices) {
    sum[0] += positions[v * 3];
    sum[1] += positions[v * 3 + 1];
    sum[2] += positions[v * 3 + 2];
  }
  return [sum[0] / vertices.length, sum[1] / vertices.length, sum[2] / vertices.length];
}
