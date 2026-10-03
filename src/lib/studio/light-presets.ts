/**
 * @file light-presets.ts
 * @description Colour temperature conversion and key/fill/rim placement around the subject.
 * @scope cinelab-studio
 * @depends ./scene-storage
 */

import type { StudioLight, StudioModel } from "./scene-storage";

export type LightRole = "key" | "fill" | "rim";

export const MIN_KELVIN = 2000;
export const MAX_KELVIN = 10000;
/** Height in metres the role presets aim at (roughly the subject's face). */
export const SUBJECT_AIM_HEIGHT = 1.45;

/** Approximate sRGB of a black-body radiator (Tanner Helland fit), as #rrggbb. */
export function kelvinToHex(kelvin: number): string {
  const t = Math.max(MIN_KELVIN, Math.min(MAX_KELVIN, kelvin)) / 100;
  const red = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const green = t <= 66
    ? 99.4708025861 * Math.log(t) - 161.1195681661
    : 288.1221695283 * (t - 60) ** -0.0755148492;
  const blue = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return `#${[red, green, blue]
    .map((channel) => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

type RoleSpec = {
  /** Offset from the subject in its own frame: +x camera-left of subject's right, +z in front. */
  offset: [number, number];
  height: number;
  intensity: number;
  modifier: StudioLight["modifier"];
  softboxWidth: number;
  softboxHeight: number;
  spread: number;
};

export const LIGHT_ROLES: Record<LightRole, RoleSpec> = {
  key: { offset: [-1.8, 1.6], height: 2.6, intensity: 120, modifier: "softbox", softboxWidth: 120, softboxHeight: 90, spread: 0.8 },
  fill: { offset: [2.2, 1.9], height: 1.9, intensity: 45, modifier: "softbox", softboxWidth: 100, softboxHeight: 100, spread: 0.9 },
  rim: { offset: [1.4, -2], height: 2.8, intensity: 110, modifier: "none", softboxWidth: 90, softboxHeight: 60, spread: 0.35 },
};

export type RolePlacement = Pick<
  StudioLight,
  "position" | "homePosition" | "rotation" | "headRotation" | "height" | "intensity" | "modifier" | "softboxWidth" | "softboxHeight" | "spread" | "role"
>;

/** Places and aims a light for a role around a subject standing at `subject` facing its local +z. */
export function lightRolePlacement(
  role: LightRole,
  subject: Pick<StudioModel, "position" | "rotation">,
): RolePlacement {
  const spec = LIGHT_ROLES[role];
  const yaw = subject.rotation[1];
  const [ox, oz] = spec.offset;
  const x = subject.position[0] + ox * Math.cos(yaw) + oz * Math.sin(yaw);
  const z = subject.position[2] - ox * Math.sin(yaw) + oz * Math.cos(yaw);
  const dx = subject.position[0] - x;
  const dz = subject.position[2] - z;
  const pitch = (Math.atan2(spec.height - SUBJECT_AIM_HEIGHT, Math.hypot(dx, dz)) * 180) / Math.PI;
  const position: [number, number, number] = [x, 0, z];
  return {
    position,
    homePosition: [...position],
    rotation: [0, Math.atan2(dx, dz), 0],
    headRotation: [Math.round(pitch * 10) / 10, 0, 0],
    height: spec.height,
    intensity: spec.intensity,
    modifier: spec.modifier,
    softboxWidth: spec.softboxWidth,
    softboxHeight: spec.softboxHeight,
    spread: spec.spread,
    role,
  };
}
