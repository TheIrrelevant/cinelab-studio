/**
 * @file body-shape.ts
 * @description Applies shape parameters (macros, breast, local modifiers) to a loaded MakeHuman skinned mesh: morphs the vertices
 *   on the CPU, adds the facial expression (plan 3.1) to the rendered surface only, subdivides it
 *   to the dense body (plan 2.8), recomputes seam-free normals and re-fits the skeleton (bone rest positions and
 *   inverse bind matrices) to the new joints with head/tail/roll rest frames. Pose deltas are
 *   preserved across re-shapes.
 * @scope cinelab-studio
 * @depends three, ./bone-frames, ./shape-model, ./morph-data, ./normals, ./subdivision, ./face-units
 */

import { Quaternion, type BufferAttribute, type SkinnedMesh } from "three";
import { shapeTargetWeights, type ShapeParams } from "./shape-model";
import { bonePoseDelta, boneRestQuaternion, setBonePoseDelta } from "./bone-frames";
import { addMorphTargets, jointPosition, morphSourcePositions, type MorphData } from "./morph-data";
import { faceUnitWeights, type FaceExpression } from "./face-units";
import { seamlessNormals } from "./normals";
import { subdivide } from "./subdivision";

export type BodyShapeResult = {
  /** Morphed, grounded source positions without expression (skeleton, measurements). */
  source: Float32Array;
  /** `source` plus the expression: the rendered surface (proxies fit to it). */
  surface: Float32Array;
  /** Top of the body in metres (floor is y = 0). */
  heightMetres: number;
};

export function applyBodyShape(mesh: SkinnedMesh, data: MorphData, params: ShapeParams, expression?: FaceExpression): BodyShapeResult {
  const source = morphSourcePositions(data, shapeTargetWeights(params, data.modifiers?.catalogue));
  // Height stays on the coarse cage so it matches the measurements.
  let top = 0;
  for (const v of data.subdivision.cageVertices) top = Math.max(top, source[v * 3 + 1]);
  const surface = applyExpression(mesh, data, source, expression);
  refitSkeleton(mesh, data, source);
  return { source, surface, heightMetres: top };
}

/**
 * Renders `source` plus the expression on the mesh (dense positions and normals) without touching
 * the skeleton, so expressions change cheaply. Returns the expressed source positions.
 */
export function applyExpression(mesh: SkinnedMesh, data: MorphData, source: Float32Array, expression?: FaceExpression): Float32Array {
  const weights = faceUnitWeights(expression);
  const surface = weights.size ? addMorphTargets(data, weights, Float32Array.from(source)) : source;
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position") as BufferAttribute;
  const normal = geometry.getAttribute("normal") as BufferAttribute;
  const positions = position.array as Float32Array;
  const { vertexSource, subdivision } = data;
  if (position.count !== vertexSource.length) throw new Error("Mesh does not match the morph pack");

  const dense = subdivide(subdivision, surface, 3);
  for (let i = 0; i < vertexSource.length; i += 1) {
    const s = vertexSource[i] * 3;
    positions[i * 3] = dense[s];
    positions[i * 3 + 1] = dense[s + 1];
    positions[i * 3 + 2] = dense[s + 2];
  }
  const index = geometry.getIndex();
  if (!index) throw new Error("MakeHuman mesh must be indexed");
  seamlessNormals(positions, index.array, vertexSource, subdivision.denseCount, normal.array as Float32Array);
  position.needsUpdate = true;
  normal.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return surface;
}

/**
 * Moves bones to the morphed joints with head/tail/roll rest frames, rebinds, then restores each
 * bone's pose delta on top of its new rest frame.
 */
function refitSkeleton(mesh: SkinnedMesh, data: MorphData, source: Float32Array) {
  const { bones } = mesh.skeleton;
  const spec = data.manifest.bones;
  if (bones.length !== spec.length) throw new Error("Skeleton does not match the morph pack");
  const deltas = bones.map(bonePoseDelta);
  const heads = spec.map((bone) => jointPosition(source, bone.head));
  const worlds = spec.map((bone, i) => boneRestQuaternion(heads[i], jointPosition(source, bone.tail), bone.roll));
  bones.forEach((bone, i) => {
    const parent = spec[i].parent;
    const inverseParent = parent >= 0 ? worlds[parent].clone().invert() : new Quaternion();
    const parentHead = parent >= 0 ? heads[parent] : [0, 0, 0];
    bone.position
      .set(heads[i][0] - parentHead[0], heads[i][1] - parentHead[1], heads[i][2] - parentHead[2])
      .applyQuaternion(inverseParent);
    const rest = inverseParent.multiply(worlds[i]);
    bone.userData.restQuaternion = rest.clone();
    bone.userData.restPosition = bone.position.clone();
    bone.quaternion.copy(rest);
  });
  mesh.updateWorldMatrix(true, false);
  (bones[0].parent ?? bones[0]).updateWorldMatrix(true, true);
  mesh.skeleton.calculateInverses();
  // calculateInverses works in world space; keep the binding relative to the mesh.
  mesh.bind(mesh.skeleton, mesh.matrixWorld);
  bones.forEach((bone, i) => setBonePoseDelta(bone, deltas[i]));
}
