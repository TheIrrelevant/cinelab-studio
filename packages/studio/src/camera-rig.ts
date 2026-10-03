/**
 * @file camera-rig.ts
 * @description Camera body dimensions, rig scale, lens origin offset and shutter speed table
 *   shared by the studio camera components, framing and the render contract.
 * @scope cinelab-studio
 * @depends ./camera-lenses
 */

import { CAMERA_LENSES, type CameraLensId } from "./camera-lenses";

export type CameraBodyId = "proDslr";

export const CAMERA_RIG_SCALE = 1.8;

export const CAMERA_BODIES: Record<CameraBodyId, { label: string; size: [number, number, number] }> = {
  proDslr: { label: "Professional full-frame DSLR", size: [0.26, 0.19, 0.15] },
};

export const SHUTTER_SPEEDS = [
  "30s", "15s", "8s", "4s", "2s", "1s", "1/2", "1/4", "1/8", "1/15", "1/30",
  "1/60", "1/125", "1/250", "1/500", "1/1000", "1/2000", "1/4000", "1/8000",
];

export function shutterSeconds(index: number) {
  const value = SHUTTER_SPEEDS[index] ?? "1/125";
  if (value.endsWith("s")) return Number.parseFloat(value);
  const denominator = Number.parseFloat(value.split("/")[1] ?? "125");
  return 1 / denominator;
}

/** Distance from the rig's vertical axis to the virtual lens origin along the view direction. */
export function lensOriginOffset(body: CameraBodyId, lensId: CameraLensId, zoomMm: number) {
  const lens = CAMERA_LENSES[lensId];
  const zoomRange = lens.focalMax - lens.focalMin;
  const zoomProgress = zoomRange === 0 ? 0 : (zoomMm - lens.focalMin) / zoomRange;
  const lensLength = lens.lengthMin + (lens.lengthMax - lens.lengthMin) * zoomProgress;
  return (CAMERA_BODIES[body].size[2] / 2 + lensLength) * CAMERA_RIG_SCALE + 0.04;
}
