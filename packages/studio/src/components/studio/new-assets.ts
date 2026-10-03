/**
 * @file new-assets.ts
 * @description Default values for lights and cameras added from the toolbar.
 * @scope cinelab-studio
 * @depends scene-storage, StudioCamera, studio-constants
 */

import type { StudioLight } from "../../scene-storage";
import type { StudioCameraAsset } from "../StudioCamera";
import { DEFAULT_LIGHT_HEIGHT } from "../studio-constants";

type Vec3 = [number, number, number];

export function newLight(id: string, existingCount: number): StudioLight {
  const position: Vec3 = [Math.min(existingCount * 1.4 - 1.4, 4), 0, 1.5];
  return {
    id,
    position,
    homePosition: [...position] as Vec3,
    headRotation: [0, 0, 0],
    height: DEFAULT_LIGHT_HEIGHT,
    lightType: "bare",
    rotation: [0, 0, 0],
    modifier: "none",
    softboxWidth: 90,
    softboxHeight: 60,
    intensity: 95,
    spread: 0.62,
    color: "#fff0d2",
    colorTemperature: null,
    role: null,
  };
}

export function newCamera(id: string, existingCount: number): StudioCameraAsset {
  const position: Vec3 = [1.2 + existingCount * 1.2, 0, 2];
  return {
    id,
    position,
    homePosition: [...position] as Vec3,
    rotation: [0, Math.PI, 0],
    headRotation: [0, 0, 0],
    height: 1.55,
    body: "proDslr",
    lens: "standardZoom",
    iso: 400,
    aperture: 2.8,
    shutterIndex: 12,
    focusDistance: 2,
    zoomMm: 50,
    filter: "neutral",
    previewVisible: true,
    framing: null,
  };
}
