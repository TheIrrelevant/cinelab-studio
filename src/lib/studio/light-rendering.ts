/**
 * @file light-rendering.ts
 * @description Maps a stored studio light to spotlight render parameters, including flash strobe behaviour.
 * @scope cinelab-studio
 * @depends ./scene-storage, three
 */

import type { Object3D } from "three";
import type { StudioLight } from "./scene-storage";

/** Approximate sRGB of a 5600K daylight-balanced strobe. */
export const FLASH_COLOR = "#ffeee3";
/** Flash peak output relative to the power slider. */
export const FLASH_PEAK_MULTIPLIER = 2.5;
/** Share of the flash peak shown as a modeling light in the viewport. */
export const FLASH_MODELING_RATIO = 0.15;
/** userData key holding the intensity a light should have while the camera feed captures. */
export const CAPTURE_INTENSITY_KEY = "captureIntensity";

export type LightRenderParams = {
  color: string;
  angle: number;
  penumbra: number;
  /** Intensity in the interactive viewport. */
  intensity: number;
  /** Intensity while the studio camera captures a frame. */
  captureIntensity: number;
  emissiveIntensity: number;
};

export function lightRenderParams(light: StudioLight): LightRenderParams {
  const hasSoftbox = light.modifier === "softbox";
  const softAngle = Math.max(light.spread, 0.7);
  const hardAngle = Math.min(light.spread, 0.48);

  if (light.lightType !== "flash") {
    return {
      color: light.color,
      angle: hasSoftbox ? softAngle : hardAngle,
      penumbra: hasSoftbox ? 0.92 : 0.12,
      intensity: light.intensity,
      captureIntensity: light.intensity,
      emissiveIntensity: 2.6,
    };
  }

  const peak = light.intensity * FLASH_PEAK_MULTIPLIER;
  return {
    color: FLASH_COLOR,
    angle: hasSoftbox ? softAngle : hardAngle * 0.8,
    penumbra: hasSoftbox ? 0.85 : 0.04,
    intensity: peak * FLASH_MODELING_RATIO,
    captureIntensity: peak,
    emissiveIntensity: 0.9,
  };
}

type IntensityObject = Object3D & { intensity: number };

/** Sets every light tagged with a capture intensity to that value; returns a callback restoring the originals. */
export function applyCaptureIntensities(root: Object3D): () => void {
  const changed: Array<[IntensityObject, number]> = [];
  root.traverse((object) => {
    const target: unknown = object.userData[CAPTURE_INTENSITY_KEY];
    if (typeof target !== "number" || !("intensity" in object)) return;
    const light = object as IntensityObject;
    if (typeof light.intensity !== "number" || light.intensity === target) return;
    changed.push([light, light.intensity]);
    light.intensity = target;
  });
  return () => {
    changed.forEach(([light, intensity]) => {
      light.intensity = intensity;
    });
  };
}
