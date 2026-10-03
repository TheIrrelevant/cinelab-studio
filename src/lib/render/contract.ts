/**
 * @file contract.ts
 * @description Provider-neutral render contract: SceneJSON, render request/result,
 *   status lifecycle and error model. Providers and adapters consume these types;
 *   nothing here names a specific AI service.
 * @scope cinelab-studio
 * @depends zod, studio/poses.ts
 */

import { z } from "zod";
import { POSE_IDS } from "@/lib/studio/poses";

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

export const RENDER_KINDS = ["preview", "final"] as const;
export type RenderKind = (typeof RENDER_KINDS)[number];

export const RENDER_OUTPUT_SIZES: Record<RenderKind, { width: number; height: number }> = {
  preview: { width: 1024, height: 576 },
  final: { width: 3840, height: 2160 },
};

export const renderRequestSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  kind: z.enum(RENDER_KINDS),
  scene: sceneJsonSchema,
  /** SHA-256 of the canonical scene JSON; identical scenes share a hash. */
  sceneHash: z.string().regex(/^[0-9a-f]{64}$/),
  output: z.object({ width: z.number().int().positive(), height: z.number().int().positive(), aspectRatio: z.literal("16:9") }),
  seed: z.number().int().nonnegative().nullable(),
});

export type RenderRequest = z.infer<typeof renderRequestSchema>;

export const RENDER_STATUSES = ["queued", "running", "succeeded", "failed", "cancelled"] as const;
export type RenderStatus = (typeof RENDER_STATUSES)[number];

const TRANSITIONS: Record<RenderStatus, readonly RenderStatus[]> = {
  queued: ["running", "failed", "cancelled"],
  running: ["succeeded", "failed", "cancelled"],
  succeeded: [],
  failed: [],
  cancelled: [],
};

export function canTransition(from: RenderStatus, to: RenderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: RenderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export const RENDER_ERROR_CODES = [
  "invalid_request",
  "provider_unavailable",
  "rate_limited",
  "content_rejected",
  "timeout",
  "internal",
] as const;
export type RenderErrorCode = (typeof RENDER_ERROR_CODES)[number];

const RETRYABLE: Record<RenderErrorCode, boolean> = {
  invalid_request: false,
  provider_unavailable: true,
  rate_limited: true,
  content_rejected: false,
  timeout: true,
  internal: true,
};

export const renderErrorSchema = z.object({
  code: z.enum(RENDER_ERROR_CODES),
  /** Human-readable, actionable message shown to the user. */
  message: z.string().min(1),
  retryable: z.boolean(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type RenderError = z.infer<typeof renderErrorSchema>;

export function renderError(code: RenderErrorCode, message: string, details?: Record<string, unknown>): RenderError {
  return { code, message, retryable: RETRYABLE[code], ...(details ? { details } : {}) };
}

export const renderOutputSchema = z.object({
  /** Asset id or URL; storage is up to the pipeline. */
  uri: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  mimeType: z.string().min(1),
});

export const renderResultSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(RENDER_STATUSES),
  /** Filled in by whichever provider ran the request; kept for reproducibility. */
  provider: z.object({ id: z.string(), model: z.string().nullable(), params: z.record(z.string(), z.unknown()) }).nullable(),
  outputs: z.array(renderOutputSchema),
  error: renderErrorSchema.nullable(),
  queuedAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
}).refine((result) => (result.status === "failed") === (result.error !== null), {
  message: "Failed results need an error and only failed results may carry one",
}).refine((result) => result.status === "succeeded" || result.outputs.length === 0, {
  message: "Only succeeded results carry outputs",
});

export type RenderResult = z.infer<typeof renderResultSchema>;

export const renderRecordSchema = z.object({
  request: renderRequestSchema,
  result: renderResultSchema,
});

export type RenderRecord = z.infer<typeof renderRecordSchema>;
