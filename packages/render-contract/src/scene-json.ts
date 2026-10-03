/**
 * @file scene-json.ts
 * @description Builds the provider-neutral SceneJSON and render requests from the
 *   saved studio scene and the placed character, plus a canonical hash for reproducibility.
 * @scope cinelab-studio
 * @depends contract.ts, studio/*, character/*
 */

import type { Character } from "@cinelab/character/schema";
import { getBaseModel, getHairStyle, getSkinTone } from "@cinelab/character/presets";
import { CAMERA_LENSES } from "@cinelab/studio/camera-lenses";
import { verticalFieldOfView } from "@cinelab/studio/camera-feed";
import { SHUTTER_SPEEDS, lensOriginOffset, shutterSeconds } from "@cinelab/studio/camera-rig";
import { lightRenderParams } from "@cinelab/studio/light-rendering";
import { SUBJECT_AIM_HEIGHT } from "@cinelab/studio/light-presets";
import { mannequinSpec } from "@cinelab/character/mannequin";
import { POSES } from "@cinelab/human/poses";
import { BACKDROP_COLORS, type StudioLight, type StudioSceneData } from "@cinelab/studio/scene-storage";
import {
  RENDER_OUTPUT_SIZES,
  SCENE_JSON_VERSION,
  renderRequestSchema,
  sceneJsonSchema,
  type RenderKind,
  type RenderRequest,
  type SceneJson,
} from "./contract";

type SceneCamera = StudioSceneData["cameras"][number];

export type SceneJsonResult = { ok: true; scene: SceneJson } | { ok: false; issues: string[] };

const deg = (radians: number) => Math.round(((radians * 180) / Math.PI) * 10) / 10;
const round = (value: number, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;
const roundVec = (v: readonly number[]) => v.map((n) => round(n)) as [number, number, number];

/** Picks the camera that renders: the requested one, else the first with a visible preview, else the first. */
export function pickRenderCamera(cameras: readonly SceneCamera[], cameraId?: string): SceneCamera | undefined {
  if (cameraId) return cameras.find((camera) => camera.id === cameraId);
  return cameras.find((camera) => camera.previewVisible) ?? cameras[0];
}

function describeLight(light: StudioLight, subjectPosition: [number, number, number], subjectYaw: number) {
  const params = lightRenderParams(light);
  const dx = light.position[0] - subjectPosition[0];
  const dz = light.position[2] - subjectPosition[2];
  // Offset in the subject's own frame (inverse of the yaw rotation).
  const localX = dx * Math.cos(subjectYaw) - dz * Math.sin(subjectYaw);
  const localZ = dx * Math.sin(subjectYaw) + dz * Math.cos(subjectYaw);
  const distance = Math.hypot(dx, dz);
  return {
    id: light.id,
    role: light.role,
    type: light.lightType === "flash" ? ("flash" as const) : ("continuous" as const),
    modifier: light.modifier === "softbox"
      ? { kind: "softbox" as const, widthCm: light.softboxWidth, heightCm: light.softboxHeight }
      : { kind: "bare" as const },
    power: light.intensity,
    effectivePower: round(params.captureIntensity, 1),
    color: params.color.toLowerCase(),
    colorTemperatureK: light.lightType === "flash" ? 5600 : light.colorTemperature,
    beamSpreadDeg: deg(params.angle),
    positionM: roundVec(light.position),
    heightM: light.height,
    aimDeg: { yaw: deg(light.rotation[1]) + light.headRotation[1], pitch: light.headRotation[0] },
    relativeToSubject: {
      azimuthDeg: deg(Math.atan2(localX, localZ)),
      elevationDeg: deg(Math.atan2(light.height - SUBJECT_AIM_HEIGHT, distance)),
      distanceM: round(distance, 2),
    },
  };
}

export function buildSceneJson(
  scene: StudioSceneData,
  characters: readonly Character[],
  options: { cameraId?: string } = {},
): SceneJsonResult {
  const issues: string[] = [];
  const character = scene.model ? characters.find((c) => c.id === scene.model?.characterId) : undefined;
  if (!scene.model || !character) issues.push("Place a character in the studio (Model tool).");
  const camera = pickRenderCamera(scene.cameras, options.cameraId);
  if (!camera) issues.push(options.cameraId ? `Camera ${options.cameraId} does not exist.` : "Add a camera to frame the shot.");
  if (scene.lights.length === 0) issues.push("Add at least one light.");
  if (issues.length > 0 || !scene.model || !character || !camera) return { ok: false, issues };

  const spec = mannequinSpec(character);
  const subjectPosition = scene.model.position;
  const subjectYaw = scene.model.rotation[1];
  const lens = CAMERA_LENSES[camera.lens];
  const lensOffset = lensOriginOffset(camera.body, camera.lens, camera.zoomMm);
  const cameraYaw = camera.rotation[1] + (camera.headRotation[1] * Math.PI) / 180;
  const lensX = camera.position[0] + Math.sin(cameraYaw) * lensOffset;
  const lensZ = camera.position[2] + Math.cos(cameraYaw) * lensOffset;

  const json: SceneJson = {
    version: SCENE_JSON_VERSION,
    units: { length: "m", angle: "deg" },
    character: {
      id: character.id,
      name: character.name,
      baseModel: { id: character.baseModelId, label: getBaseModel(character.baseModelId)?.label ?? character.baseModelId },
      genderPresentation: character.genderPresentation,
      bodyPreset: character.bodyPreset,
      heightM: spec.height,
      skinTone: { id: character.skinTone, label: getSkinTone(character.skinTone)?.label ?? character.skinTone, hex: spec.skin.toLowerCase() },
      hair: { style: character.hairStyle, label: getHairStyle(character.hairStyle)?.label ?? character.hairStyle, color: character.hairColor.toLowerCase() },
      faceReferenceImageIds: [...character.faceReferenceImageIds],
      notes: character.notes,
    },
    outfit: { items: [] },
    subject: {
      positionM: roundVec(subjectPosition),
      yawDeg: deg(subjectYaw),
      pose: { preset: scene.model.pose, label: POSES[scene.model.pose].label },
    },
    camera: {
      id: camera.id,
      body: camera.body,
      lens: { id: camera.lens, label: lens.label },
      focalLengthMm: camera.zoomMm,
      aperture: camera.aperture,
      iso: camera.iso,
      shutter: { label: SHUTTER_SPEEDS[camera.shutterIndex] ?? "1/125", seconds: shutterSeconds(camera.shutterIndex) },
      focusDistanceM: camera.focusDistance,
      filter: camera.filter,
      framing: camera.framing,
      sensor: { widthMm: 36, aspectRatio: "16:9" },
      verticalFovDeg: round(verticalFieldOfView(camera.zoomMm), 2),
      positionM: roundVec(camera.position),
      heightM: camera.height,
      orientationDeg: { yaw: deg(cameraYaw), tilt: camera.headRotation[0], roll: camera.headRotation[2] },
      distanceToSubjectM: round(Math.hypot(subjectPosition[0] - lensX, subjectPosition[2] - lensZ), 2),
    },
    lights: scene.lights.map((light) => describeLight(light, subjectPosition, subjectYaw)),
    backdrop: { kind: "seamless-paper", color: scene.backdrop.color, hex: BACKDROP_COLORS[scene.backdrop.color] },
  };
  return { ok: true, scene: sceneJsonSchema.parse(json) };
}

/** JSON with object keys sorted recursively, so equal scenes serialise identically. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function hashScene(scene: SceneJson): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(scene));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildRenderRequest(
  scene: SceneJson,
  options: { kind: RenderKind; seed?: number | null; id?: string; now?: Date },
): Promise<RenderRequest> {
  const size = RENDER_OUTPUT_SIZES[options.kind];
  return renderRequestSchema.parse({
    id: options.id ?? `render-${globalThis.crypto.randomUUID()}`,
    createdAt: (options.now ?? new Date()).toISOString(),
    kind: options.kind,
    scene,
    sceneHash: await hashScene(scene),
    output: { ...size, aspectRatio: "16:9" },
    seed: options.seed ?? null,
  });
}
