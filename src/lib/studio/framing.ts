/**
 * @file framing.ts
 * @description Portrait / half-body / full-body camera framing around the subject.
 * @scope cinelab-studio
 * @depends ./camera-lenses, ./camera-feed, ./scene-storage
 */

import { CAMERA_LENSES, type CameraLensId } from "./camera-lenses";
import { verticalFieldOfView } from "./camera-feed";
import type { StudioModel } from "./scene-storage";

export type FramingId = "portrait" | "halfBody" | "fullBody";

/** Reference standing height the framing proportions are written for. */
const REFERENCE_HEIGHT = 1.72;

export const FRAMINGS: Record<FramingId, { label: string; lens: CameraLensId; zoomMm: number; frameHeight: number; centerHeight: number }> = {
  portrait: { label: "Portrait", lens: "prime85", zoomMm: 85, frameHeight: 0.62, centerHeight: 1.5 },
  halfBody: { label: "Half body", lens: "standardZoom", zoomMm: 50, frameHeight: 1.05, centerHeight: 1.25 },
  fullBody: { label: "Full body", lens: "standardZoom", zoomMm: 35, frameHeight: 2.4, centerHeight: 1 },
};

export type FramingPlacement = {
  position: [number, number, number];
  homePosition: [number, number, number];
  rotation: [number, number, number];
  headRotation: [number, number, number];
  height: number;
  lens: CameraLensId;
  zoomMm: number;
  aperture: number;
  focusDistance: number;
  framing: FramingId;
};

/**
 * Places a level camera in front of the subject so the preset's frame height fills the
 * 16:9 viewfinder. `lensOffset` is the distance the lens origin sits ahead of the rig.
 */
export function framingPlacement(
  framing: FramingId,
  subject: Pick<StudioModel, "position" | "rotation">,
  subjectHeight: number,
  currentAperture: number,
  lensOffset: (lens: CameraLensId, zoomMm: number) => number,
): FramingPlacement {
  const preset = FRAMINGS[framing];
  const lens = CAMERA_LENSES[preset.lens];
  const scale = subjectHeight / REFERENCE_HEIGHT;
  const halfFov = (verticalFieldOfView(preset.zoomMm) * Math.PI) / 360;
  const distance = Math.max(lens.minFocus, (preset.frameHeight * scale) / (2 * Math.tan(halfFov)));
  const rigDistance = distance + lensOffset(preset.lens, preset.zoomMm);
  const yaw = subject.rotation[1];
  const forward: [number, number] = [Math.sin(yaw), Math.cos(yaw)];
  const position: [number, number, number] = [
    subject.position[0] + forward[0] * rigDistance,
    0,
    subject.position[2] + forward[1] * rigDistance,
  ];
  return {
    position,
    homePosition: [...position],
    rotation: [0, Math.atan2(-forward[0], -forward[1]), 0],
    headRotation: [0, 0, 0],
    height: Math.max(0.8, Math.min(3, preset.centerHeight * scale)),
    lens: preset.lens,
    zoomMm: preset.zoomMm,
    aperture: Math.max(currentAperture, lens.maxAperture),
    focusDistance: Math.min(20, Math.round(distance * 100) / 100),
    framing,
  };
}
