/**
 * @file camera-types.ts
 * @description Studio camera asset type, patch type, ISO values, filters and angle axes.
 * @scope cinelab-studio
 * @depends camera-rig, camera-lenses, framing
 */

import type { CameraBodyId } from "../../camera-rig";
import type { CameraLensId } from "../../camera-lenses";
import type { FramingId } from "../../framing";

export type { CameraBodyId } from "../../camera-rig";
export type { CameraLensId } from "../../camera-lenses";

export type CameraFilterId = "neutral" | "warm" | "cool" | "mono" | "cinematic";

export type StudioCameraAsset = {
  id: string;
  position: [number, number, number];
  homePosition: [number, number, number];
  rotation: [number, number, number];
  headRotation: [number, number, number];
  height: number;
  body: CameraBodyId;
  lens: CameraLensId;
  iso: number;
  aperture: number;
  shutterIndex: number;
  focusDistance: number;
  zoomMm: number;
  filter: CameraFilterId;
  previewVisible: boolean;
  framing: FramingId | null;
};

export type CameraPatch = Partial<
  Omit<StudioCameraAsset, "id" | "position" | "homePosition" | "rotation">
>;





export const ISO_VALUES = [64, 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600];

export const FILTERS: Array<{ id: CameraFilterId; label: string; color: string }> = [
  { id: "neutral", label: "Neutral", color: "#d5d5d5" },
  { id: "warm", label: "Warm", color: "#f0a15f" },
  { id: "cool", label: "Cool", color: "#7ea6dd" },
  { id: "mono", label: "Mono", color: "#777777" },
  { id: "cinematic", label: "Cinema", color: "#4d756e" },
];

export const HEAD_AXES = ["X", "Y", "Z"] as const;

