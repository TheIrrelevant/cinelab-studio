/**
 * @file body-shape.ts
 * @description Applies body parameters to a loaded MakeHuman skinned mesh: morphs the vertices
 *   on the CPU, recomputes seam-free normals and re-fits the skeleton (bone rest positions and
 *   inverse bind matrices) to the new joint positions. Bone rotations are preserved.
 * @scope cinelab-studio
 * @depends three, ./macro, ./morph-data, ./normals
 */

import { Quaternion, type BufferAttribute, type SkinnedMesh } from "three";
import { macroTargetWeights, type BodyParams } from "./macro";
import { jointPosition, morphSourcePositions, type MorphData } from "./morph-data";
import { seamlessNormals } from "./normals";

export type BodyShapeResult = {
  /** Morphed, grounded source positions (reusable for measurements). */
  source: Float32Array;
  /** Top of the body in metres (floor is y = 0). */
  heightMetres: number;
};

export function applyBodyShape(mesh: SkinnedMesh, data: MorphData, params: BodyParams): BodyShapeResult {
  const source = morphSourcePositions(data, macroTargetWeights(params));
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position") as BufferAttribute;
  const normal = geometry.getAttribute("normal") as BufferAttribute;
  const positions = position.array as Float32Array;
  const { vertexSource } = data;
  if (position.count !== vertexSource.length) throw new Error("Mesh does not match the morph pack");

  let top = 0;
  for (let i = 0; i < vertexSource.length; i += 1) {
    const s = vertexSource[i] * 3;
    positions[i * 3] = source[s];
    positions[i * 3 + 1] = source[s + 1];
    positions[i * 3 + 2] = source[s + 2];
    top = Math.max(top, source[s + 1]);
  }
  const index = geometry.getIndex();
  if (!index) throw new Error("MakeHuman mesh must be indexed");
  seamlessNormals(positions, index.array, vertexSource, data.manifest.sourceCount, normal.array as Float32Array);
  position.needsUpdate = true;
  normal.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  refitSkeleton(mesh, data, source);
  return { source, heightMetres: top };
}

/** Moves bones to the morphed joints in rest pose, rebinds, then restores the pose rotations. */
function refitSkeleton(mesh: SkinnedMesh, data: MorphData, source: Float32Array) {
  const { bones } = mesh.skeleton;
  const spec = data.manifest.bones;
  if (bones.length !== spec.length) throw new Error("Skeleton does not match the morph pack");
  const saved = bones.map((bone) => bone.quaternion.clone());
  const heads = spec.map((bone) => jointPosition(source, bone.head));
  bones.forEach((bone, i) => {
    const parentHead = spec[i].parent >= 0 ? heads[spec[i].parent] : [0, 0, 0];
    bone.position.set(heads[i][0] - parentHead[0], heads[i][1] - parentHead[1], heads[i][2] - parentHead[2]);
    bone.quaternion.copy(IDENTITY);
  });
  mesh.updateWorldMatrix(true, false);
  (bones[0].parent ?? bones[0]).updateWorldMatrix(true, true);
  mesh.skeleton.calculateInverses();
  // calculateInverses works in world space; keep the binding relative to the mesh.
  mesh.bind(mesh.skeleton, mesh.matrixWorld);
  bones.forEach((bone, i) => bone.quaternion.copy(saved[i]));
}

const IDENTITY = new Quaternion();
