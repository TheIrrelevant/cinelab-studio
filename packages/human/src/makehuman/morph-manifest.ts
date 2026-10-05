/**
 * @file morph-manifest.ts
 * @description JSON manifest of the MakeHuman morph pack, shared by the converter (writer) and
 *   the runtime (reader). Offsets are byte offsets into makehuman-morphs.bin.
 * @scope cinelab-studio
 * @depends none
 */

export type Section = { offset: number; length: number };

export type PackedTarget = {
  name: string;
  count: number;
  /** Byte offset of `count` Uint16 source indices. */
  indexOffset: number;
  /** Byte offset of `count * 3` Int16 deltas; metres = value * scale. */
  deltaOffset: number;
};

export type MorphManifest = {
  version: 1;
  units: "m";
  sourceCount: number;
  vertexCount: number;
  /** Float32 xyz per source vertex (grounded base body). */
  sourcePositions: Section;
  /** Uint16 source index per GLB vertex, in GLB vertex order. */
  vertexSource: Section;
  /** Source vertices whose mean is the floor contact point. */
  ground: number[];
  /** Parent-first, same order as the GLB skin joints; head/tail are source vertex lists, roll is the Blender roll in radians. */
  bones: Array<{ name: string; parent: number; head: number[]; tail: number[]; roll: number }>;
  scale: number;
  targets: PackedTarget[];
};
