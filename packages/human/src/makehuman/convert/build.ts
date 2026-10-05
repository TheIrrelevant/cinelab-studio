/**
 * @file build.ts
 * @description MakeHuman conversion pipeline. Produces (1) a skinned base-body GLB in metres,
 *   grounded at the joint-ground cube, and (2) a morph pack (binary + manifest) holding the
 *   source vertex positions, render-to-source map, bone joint vertex lists and packed targets,
 *   and (3) a proxy pack (hair, eyes, eyebrows, eyelashes fitted to source vertices).
 *   The source set is every OBJ vertex used by the body, the rig, the ground marker or a proxy.
 * @scope cinelab-studio
 * @depends ./obj-mesh.ts, ./rig-refs.ts, ./skin-weights.ts, ./morph-pack.ts, ./glb-writer.ts,
 *   ./binary-builder.ts, ./proxy-pack.ts, ../normals.ts, ../morph-manifest.ts, ../proxy-manifest.ts
 */

import { BinaryBuilder } from "./binary-builder.ts";
import { writeGlb } from "./glb-writer.ts";
import { packMorphs, type NamedTarget } from "./morph-pack.ts";
import type { MorphManifest } from "../morph-manifest.ts";
import type { ProxyManifest } from "../proxy-manifest.ts";
import { packProxy, proxyBaseVertices, type ProxyInput } from "./proxy-pack.ts";
import { buildGroupMesh, groupVertices, parseObj } from "./obj-mesh.ts";
import { meanPosition, resolveRig, type RigJson } from "./rig-refs.ts";
import { buildSkin, type WeightsJson } from "./skin-weights.ts";
import { seamlessNormals } from "../normals.ts";

/** MakeHuman meshes are in decimetres. */
export const UNIT_TO_METRES = 0.1;
const SKIN_TONE: [number, number, number, number] = [0.78, 0.6, 0.5, 1];

export type ConvertInput = {
  obj: string;
  rig: RigJson;
  weights: WeightsJson;
  targets: NamedTarget[];
  proxies: ProxyInput[];
  eyeColours: string[];
  skins: string[];
};

export function convertMakeHuman(input: ConvertInput) {
  const obj = parseObj(input.obj);
  const body = buildGroupMesh(obj, "body");
  const rig = resolveRig(obj, input.rig);
  const groundRef = groupVertices(obj, "joint-ground");

  const required = new Set<number>(body.source);
  for (const bone of rig) [...bone.head, ...bone.tail].forEach((v) => required.add(v));
  groundRef.forEach((v) => required.add(v));
  for (const proxy of input.proxies) proxyBaseVertices(proxy).forEach((v) => required.add(v));
  const originals = [...required].sort((a, b) => a - b);
  if (originals.length > 0xffff) throw new Error(`Source set too large for Uint16: ${originals.length}`);
  const compact = new Int32Array(obj.positions.length / 3).fill(-1);
  originals.forEach((original, i) => (compact[original] = i));
  const toCompact = (list: number[]) => list.map((v) => compact[v]);

  const groundY = meanPosition(obj.positions, groundRef)[1];
  const sourcePositions = new Float32Array(originals.length * 3);
  originals.forEach((original, i) => {
    sourcePositions[i * 3] = obj.positions[original * 3] * UNIT_TO_METRES;
    sourcePositions[i * 3 + 1] = (obj.positions[original * 3 + 1] - groundY) * UNIT_TO_METRES;
    sourcePositions[i * 3 + 2] = obj.positions[original * 3 + 2] * UNIT_TO_METRES;
  });

  const vertexSource = Uint16Array.from(body.source, (v) => compact[v]);
  const positions = new Float32Array(vertexSource.length * 3);
  vertexSource.forEach((s, i) => positions.set(sourcePositions.subarray(s * 3, s * 3 + 3), i * 3));
  const normals = seamlessNormals(positions, body.indices, vertexSource, originals.length);
  const skin = buildSkin(body.source, rig.map((bone) => bone.name), input.weights);
  const bones = rig.map((bone) => ({ name: bone.name, parent: bone.parent, head: toCompact(bone.head), tail: toCompact(bone.tail), roll: bone.roll }));

  const glb = writeGlb({
    name: "makehuman-body",
    positions,
    normals,
    uvs: body.uvs,
    indices: body.indices,
    joints: skin.joints,
    weights: skin.weights,
    bones: bones.map((bone) => ({ name: bone.name, parent: bone.parent, head: meanPosition(sourcePositions, bone.head) })),
    baseColor: SKIN_TONE,
  });

  const pack = new BinaryBuilder();
  const sourceSection = pack.append(sourcePositions);
  const vertexSection = pack.append(vertexSource);
  const morphs = packMorphs(input.targets, compact, UNIT_TO_METRES, pack);
  const manifest: MorphManifest = {
    version: 1,
    units: "m",
    sourceCount: originals.length,
    vertexCount: vertexSource.length,
    sourcePositions: sourceSection,
    vertexSource: vertexSection,
    ground: toCompact(groundRef),
    bones,
    scale: morphs.scale,
    targets: morphs.targets,
  };
  const proxyBin = new BinaryBuilder();
  const boneNames = rig.map((bone) => bone.name);
  const proxyManifest: ProxyManifest = {
    version: 1,
    proxies: input.proxies.map((proxy) => packProxy(proxy, compact, UNIT_TO_METRES, boneNames, input.weights, proxyBin)),
    eyeColours: input.eyeColours,
    skins: input.skins,
  };
  return { glb, morphBin: pack.toBytes(), manifest, proxyBin: proxyBin.toBytes(), proxyManifest, unweighted: skin.unweighted };
}
