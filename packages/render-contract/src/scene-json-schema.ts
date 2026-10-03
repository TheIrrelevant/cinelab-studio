/**
 * @file scene-json-schema.ts
 * @description Zod schemas and type for the provider-neutral SceneJSON document.
 * @scope cinelab-studio
 * @depends zod, human/poses
 */

import { z } from "zod";
import { POSE_IDS } from "@cinelab/human/poses";

export const SCENE_JSON_VERSION = 1;

const vec3 = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const hex = z.string().regex(/^#[0-9a-f]{6}$/);

export const sceneCharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  baseModel: z.object({ id: z.string(), label: z.string() }),
  genderPresentation: z.string(),
  bodyPreset: z.string(),
  heightM: z.number().positive(),
  skinTone: z.object({ id: z.string(), label: z.string(), hex }),
  hair: z.object({ style: z.string(), label: z.string(), color: hex }),
  /** Image ids in the reference image store; adapters resolve them to files or URLs. */
  faceReferenceImageIds: z.array(z.string()),
  notes: z.string(),
});

export const sceneOutfitSchema = z.object({
  /** Empty until the clothing catalog (Phase 5) exists. */
  items: z.array(z.object({ id: z.string(), name: z.string(), category: z.string() })),
});

export const sceneSubjectSchema = z.object({
  positionM: vec3,
  /** Rotation about the vertical axis; 0 faces the studio front (+z). */
  yawDeg: z.number(),
  pose: z.object({ preset: z.enum(POSE_IDS), label: z.string() }),
});

export const sceneCameraSchema = z.object({
  id: z.string(),
  body: z.string(),
  lens: z.object({ id: z.string(), label: z.string() }),
  focalLengthMm: z.number().positive(),
  aperture: z.number().positive(),
  iso: z.number().positive(),
  shutter: z.object({ label: z.string(), seconds: z.number().positive() }),
  focusDistanceM: z.number().positive(),
  filter: z.string(),
  framing: z.enum(["portrait", "halfBody", "fullBody"]).nullable(),
  sensor: z.object({ widthMm: z.literal(36), aspectRatio: z.literal("16:9") }),
  verticalFovDeg: z.number().positive(),
  positionM: vec3,
  heightM: z.number().positive(),
  /** World yaw of the rig plus head yaw, tilt (positive = down) and roll. */
  orientationDeg: z.object({ yaw: z.number(), tilt: z.number(), roll: z.number() }),
  distanceToSubjectM: z.number().nonnegative(),
});

export const sceneLightSchema = z.object({
  id: z.string(),
  role: z.enum(["key", "fill", "rim"]).nullable(),
  type: z.enum(["continuous", "flash"]),
  modifier: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("bare") }),
    z.object({ kind: z.literal("softbox"), widthCm: z.number(), heightCm: z.number() }),
  ]),
  /** Power slider value (10-220) and the output actually used for capture. */
  power: z.number(),
  effectivePower: z.number(),
  color: hex,
  colorTemperatureK: z.number().int().nullable(),
  beamSpreadDeg: z.number().positive(),
  positionM: vec3,
  heightM: z.number().positive(),
  aimDeg: z.object({ yaw: z.number(), pitch: z.number() }),
  /** Placement around the subject: 0 = in front, +90 = subject's left (camera right), 180 = behind. */
  relativeToSubject: z.object({ azimuthDeg: z.number(), elevationDeg: z.number(), distanceM: z.number().nonnegative() }),
});

export const sceneBackdropSchema = z.object({
  kind: z.literal("seamless-paper"),
  color: z.enum(["white", "gray", "black"]),
  hex,
});

export const sceneJsonSchema = z.object({
  version: z.literal(SCENE_JSON_VERSION),
  units: z.object({ length: z.literal("m"), angle: z.literal("deg") }),
  character: sceneCharacterSchema,
  outfit: sceneOutfitSchema,
  subject: sceneSubjectSchema,
  camera: sceneCameraSchema,
  lights: z.array(sceneLightSchema),
  backdrop: sceneBackdropSchema,
});

export type SceneJson = z.infer<typeof sceneJsonSchema>;
