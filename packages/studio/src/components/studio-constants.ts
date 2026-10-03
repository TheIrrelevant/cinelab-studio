/**
 * @file studio-constants.ts
 * @description Shared studio types, tool ids, defaults and limits.
 * @scope cinelab-studio
 * @depends scene-storage, light-presets
 */

import type { StudioLight } from "../scene-storage";
import type { LightRole } from "../light-presets";

export type ToolId = "light" | "camera" | "model" | "pose" | "object" | "move" | "rotate" | "delete";

export type TransformMode = "translate" | "rotate";
export type LightPatch = Partial<Omit<StudioLight, "id" | "position" | "homePosition" | "rotation">>;

export const LIGHT_COLORS = ["#fff0d2", "#ffffff", "#d8e8ff", "#ffb36b", "#ef5350"];
export const HEAD_ROTATION_AXES = ["X", "Y", "Z"] as const;
export const RGB_CHANNELS = ["R", "G", "B"] as const;
export const DEFAULT_LIGHT_HEIGHT = 2.4;
export const MIN_LIGHT_HEIGHT = 1.3;
export const MAX_LIGHT_HEIGHT = 10;
export const DEFAULT_MODEL_POSITION: [number, number, number] = [0, 0, -1];
export const DEFAULT_KELVIN = 5600;
export const DEFAULT_SUBJECT_HEIGHT = 1.72;
export const FRAMING_FIELDS = ["lens", "zoomMm", "height", "headRotation"] as const;
export const LIGHT_ROLE_LABELS: Record<LightRole, string> = { key: "Key", fill: "Fill", rim: "Rim" };
/** Pointer travel (px) below which a press on the backdrop counts as a click, not an orbit drag. */
export const CLICK_TOLERANCE = 4;
/** Query parameter used by the character library to open a character in the studio. */
export const STUDIO_CHARACTER_PARAM = "character";
