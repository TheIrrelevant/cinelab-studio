/**
 * @file glb-writer.ts
 * @description Writes a binary glTF 2.0 (GLB) with one skinned triangle mesh and a bone node
 *   hierarchy. Bones carry translation only (identity rest rotation); inverse bind matrices
 *   are the negated world head positions.
 * @scope cinelab-studio
 * @depends ./binary-builder.ts
 */

import { BinaryBuilder } from "./binary-builder.ts";

export type SkinnedMeshInput = {
  name: string;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  joints: Uint16Array;
  weights: Float32Array;
  bones: Array<{ name: string; parent: number; head: [number, number, number] }>;
  baseColor: [number, number, number, number];
};

const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;
const FLOAT = 5126;
const UNSIGNED_SHORT = 5123;
const UNSIGNED_INT = 5125;

function bounds(positions: Float32Array) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], positions[i + axis]);
      max[axis] = Math.max(max[axis], positions[i + axis]);
    }
  }
  return { min, max };
}

function inverseBinds(bones: SkinnedMeshInput["bones"]): Float32Array {
  const out = new Float32Array(bones.length * 16);
  bones.forEach(({ head }, i) => {
    const m = i * 16;
    out[m] = out[m + 5] = out[m + 10] = out[m + 15] = 1;
    out[m + 12] = -head[0];
    out[m + 13] = -head[1];
    out[m + 14] = -head[2];
  });
  return out;
}

export function writeGlb(input: SkinnedMeshInput): Uint8Array {
  const bin = new BinaryBuilder();
  const bufferViews: object[] = [];
  const accessors: object[] = [];
  const add = (data: ArrayBufferView, componentType: number, type: string, count: number, target?: number, extra = {}) => {
    const { offset, length } = bin.append(data);
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: length, ...(target ? { target } : {}) });
    accessors.push({ bufferView: bufferViews.length - 1, componentType, type, count, ...extra });
    return accessors.length - 1;
  };
  const vertexCount = input.positions.length / 3;
  const attributes = {
    POSITION: add(input.positions, FLOAT, "VEC3", vertexCount, ARRAY_BUFFER, bounds(input.positions)),
    NORMAL: add(input.normals, FLOAT, "VEC3", vertexCount, ARRAY_BUFFER),
    TEXCOORD_0: add(input.uvs, FLOAT, "VEC2", vertexCount, ARRAY_BUFFER),
    JOINTS_0: add(input.joints, UNSIGNED_SHORT, "VEC4", vertexCount, ARRAY_BUFFER),
    WEIGHTS_0: add(input.weights, FLOAT, "VEC4", vertexCount, ARRAY_BUFFER),
  };
  const indices = add(input.indices, UNSIGNED_INT, "SCALAR", input.indices.length, ELEMENT_ARRAY_BUFFER);
  const inverseBindMatrices = add(inverseBinds(input.bones), FLOAT, "MAT4", input.bones.length);

  // Node 0 is the mesh; bone i is node i + 1.
  const boneNodes = input.bones.map((bone, i) => {
    const parentHead = bone.parent >= 0 ? input.bones[bone.parent].head : [0, 0, 0];
    const children = input.bones.flatMap((other, j) => (other.parent === i ? [j + 1] : []));
    return {
      name: bone.name,
      translation: bone.head.map((value, axis) => value - parentHead[axis]),
      ...(children.length ? { children } : {}),
    };
  });
  const roots = input.bones.flatMap((bone, i) => (bone.parent < 0 ? [i + 1] : []));
  const binBytes = bin.toBytes();
  const gltf = {
    asset: { version: "2.0", generator: "cinelab-studio makehuman converter" },
    scene: 0,
    scenes: [{ nodes: [0, ...roots] }],
    nodes: [{ name: input.name, mesh: 0, skin: 0 }, ...boneNodes],
    meshes: [{ name: input.name, primitives: [{ attributes, indices, material: 0 }] }],
    materials: [{ name: "skin", pbrMetallicRoughness: { baseColorFactor: input.baseColor, metallicFactor: 0, roughnessFactor: 0.6 } }],
    skins: [{ joints: input.bones.map((_, i) => i + 1), inverseBindMatrices, skeleton: roots[0] }],
    accessors,
    bufferViews,
    buffers: [{ byteLength: binBytes.byteLength }],
  };
  return container(gltf, binBytes);
}

/** GLB container: 12-byte header, JSON chunk padded with spaces, BIN chunk padded with zeros. */
function container(json: object, bin: Uint8Array): Uint8Array {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonLength = Math.ceil(jsonBytes.byteLength / 4) * 4;
  const total = 12 + 8 + jsonLength + 8 + bin.byteLength;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true); // "glTF"
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true); // "JSON"
  out.fill(0x20, 20, 20 + jsonLength);
  out.set(jsonBytes, 20);
  const binStart = 20 + jsonLength;
  view.setUint32(binStart, bin.byteLength, true);
  view.setUint32(binStart + 4, 0x004e4942, true); // "BIN\0"
  out.set(bin, binStart + 8);
  return out;
}
