/**
 * @file anthropometry.ts
 * @description Body measurements on the morphed mesh (plan 2.3): height (floor to crown), volume of
 *   the closed body mesh (divergence theorem), mass = volume x 980 kg/m3, natural waist (the
 *   smallest torso girth between the lower spine and the chest) and BMI. Works on morphed source
 *   positions, so it needs no three.js scene.
 * @scope cinelab-studio
 * @depends ./morph-data, ./mesh-slice, ./shape-model
 */

import { hullPerimeter, loopArea, sliceLoops } from "./mesh-slice";
import { jointPosition, morphSourcePositions, type MorphData } from "./morph-data";
import { shapeTargetWeights, type ShapeParams } from "./shape-model";

/** Body density in kg per cubic metre. */
export const BODY_DENSITY = 980;
const WAIST_SAMPLES = 24;

export type BodyMeasurements = {
  heightCm: number;
  volumeM3: number;
  massKg: number;
  waistCm: number;
  bmi: number;
};

/** Mesh topology for measuring, built once per loaded body. */
export type MeasureTopology = {
  /** Body triangles in source vertex indexing. */
  triangles: Uint32Array;
  /** Source vertices used by the body mesh (helpers excluded). */
  vertices: Uint32Array;
  /** Joint vertex lists bounding the waist search: lower spine head, chest head. */
  waistBand: [number[], number[]];
};

/** Maps the GLB index buffer to source vertices (UV seams share their source vertex). */
export function measureTopology(data: MorphData, index: ArrayLike<number>): MeasureTopology {
  const triangles = new Uint32Array(index.length);
  const used = new Set<number>();
  for (let i = 0; i < index.length; i += 1) {
    triangles[i] = data.vertexSource[index[i]];
    used.add(triangles[i]);
  }
  const bone = (name: string) => {
    const spec = data.manifest.bones.find((b) => b.name === name);
    if (!spec) throw new Error(`Bone missing from morph pack: ${name}`);
    return spec.head;
  };
  return { triangles, vertices: Uint32Array.from(used), waistBand: [bone("spine04"), bone("spine01")] };
}

/** Enclosed volume in cubic metres (sum of signed tetrahedra; the body mesh is closed). */
export function meshVolume(positions: Float32Array, triangles: Uint32Array): number {
  let sum = 0;
  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i] * 3;
    const b = triangles[i + 1] * 3;
    const c = triangles[i + 2] * 3;
    const [ax, ay, az] = [positions[a], positions[a + 1], positions[a + 2]];
    const [bx, by, bz] = [positions[b], positions[b + 1], positions[b + 2]];
    const [cx, cy, cz] = [positions[c], positions[c + 1], positions[c + 2]];
    sum += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return sum / 6;
}

/** Floor (lowest body vertex) to crown, in metres. */
export function bodyHeight(positions: Float32Array, vertices: Uint32Array): number {
  let top = -Infinity;
  let bottom = Infinity;
  for (const v of vertices) {
    const y = positions[v * 3 + 1];
    if (y > top) top = y;
    if (y < bottom) bottom = y;
  }
  return top - bottom;
}

/** Height and mass only: what the solver needs, without the waist slices. */
export function measureSize(positions: Float32Array, topology: MeasureTopology): { heightCm: number; massKg: number } {
  return {
    heightCm: bodyHeight(positions, topology.vertices) * 100,
    massKg: meshVolume(positions, topology.triangles) * BODY_DENSITY,
  };
}

/** Torso girth at `y`: the largest cross-section (arms are separate, smaller loops). */
export function torsoGirth(positions: Float32Array, triangles: Uint32Array, y: number): number {
  let best = { area: 0, girth: 0 };
  for (const loop of sliceLoops(positions, triangles, y)) {
    const area = loopArea(loop);
    if (area > best.area) best = { area, girth: hullPerimeter(loop) };
  }
  return best.girth;
}

/** Natural waist in metres: the smallest torso girth inside the waist band. */
export function waistGirth(positions: Float32Array, topology: MeasureTopology): number {
  const low = jointPosition(positions, topology.waistBand[0])[1];
  const high = jointPosition(positions, topology.waistBand[1])[1];
  let waist = Infinity;
  for (let i = 0; i <= WAIST_SAMPLES; i += 1) {
    const girth = torsoGirth(positions, topology.triangles, low + ((high - low) * i) / WAIST_SAMPLES);
    if (girth > 0) waist = Math.min(waist, girth);
  }
  return Number.isFinite(waist) ? waist : 0;
}

export function measureBody(positions: Float32Array, topology: MeasureTopology): BodyMeasurements {
  const { heightCm, massKg } = measureSize(positions, topology);
  const metres = heightCm / 100;
  return {
    heightCm,
    volumeM3: massKg / BODY_DENSITY,
    massKg,
    waistCm: waistGirth(positions, topology) * 100,
    bmi: massKg / (metres * metres),
  };
}

/** Size measurer for the solver: morphs `params` (reusing one buffer) and measures height and mass. */
export function sizeMeasurer(data: MorphData, topology: MeasureTopology): (params: ShapeParams) => { heightCm: number; massKg: number } {
  const buffer = new Float32Array(data.basePositions.length);
  return (params) => measureSize(morphSourcePositions(data, shapeTargetWeights(params, data.modifiers?.catalogue), buffer), topology);
}

/** Morphs `params` and takes every measurement. */
export function measureShape(data: MorphData, topology: MeasureTopology, params: ShapeParams): BodyMeasurements {
  return measureBody(morphSourcePositions(data, shapeTargetWeights(params, data.modifiers?.catalogue)), topology);
}
