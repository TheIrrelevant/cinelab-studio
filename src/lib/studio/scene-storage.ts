/**
 * @file scene-storage.ts
 * @description Validated, versioned scene storage and collision-free restored asset counters.
 * @depends zod, camera-lenses.ts
 */
import { z } from "zod";
import { CAMERA_LENSES } from "./camera-lenses";

export const STUDIO_SCENE_STORAGE_KEY = "cinelab-studio-scene-v1";
const vector = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const headRotation = z.tuple([z.number().min(-180).max(180), z.number().min(-180).max(180), z.number().min(-180).max(180)]);
const transform = { position: vector, homePosition: vector, rotation: vector, headRotation };
const assetId = (prefix: string) => z.string().regex(new RegExp(`^${prefix}-(0|[1-9][0-9]*)$`))
  .refine((id) => Number.isSafeInteger(Number(id.split("-")[1])) && Number(id.split("-")[1]) < Number.MAX_SAFE_INTEGER - 1);
export const studioLightSchema = z.object({
  ...transform,
  id: assetId("light"),
  height: z.number().min(1.3).max(10),
  lightType: z.enum(["bare", "flash"]).default("bare"),
  modifier: z.enum(["none", "softbox"]),
  softboxWidth: z.number().min(20).max(200),
  softboxHeight: z.number().min(20).max(200),
  intensity: z.number().min(10).max(220),
  spread: z.number().min(0.2).max(1.15),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export const studioCameraSchema = z.object({
  ...transform,
  id: assetId("camera"),
  height: z.number().min(0.8).max(3),
  body: z.literal("proDslr"),
  lens: z.enum(["wideZoom", "standardZoom", "teleZoom", "prime50", "prime85"]),
  iso: z.number().refine((value) => [64,100,200,400,800,1600,3200,6400,12800,25600].includes(value)),
  aperture: z.number().min(1.4).max(22),
  shutterIndex: z.number().int().min(0).max(18),
  focusDistance: z.number().positive().max(20),
  zoomMm: z.number().min(14).max(200),
  bokeh: z.number().min(0).max(100),
  filter: z.enum(["neutral", "warm", "cool", "mono", "cinematic"]),
  previewVisible: z.boolean(),
}).refine((camera) => {
  const lens = CAMERA_LENSES[camera.lens];
  return camera.zoomMm >= lens.focalMin && camera.zoomMm <= lens.focalMax
    && camera.aperture >= lens.maxAperture && camera.focusDistance >= lens.minFocus;
}, { message: "Camera settings are outside the selected lens limits" });

export const studioModelSchema = z.object({
  characterId: z.string().min(1),
  position: vector,
  rotation: vector,
});

export const studioSceneSchema = z.object({
  version: z.literal(1),
  lights: z.array(studioLightSchema),
  cameras: z.array(studioCameraSchema),
  // Optional for saves made before characters could be placed in the studio.
  model: studioModelSchema.nullable().default(null),
}).refine((scene) => {
  const ids = [...scene.lights, ...scene.cameras].map((asset) => asset.id);
  return new Set(ids).size === ids.length;
}, { message: "Scene asset IDs must be unique" });

export type StudioLight = z.infer<typeof studioLightSchema>;
export type StudioModel = z.infer<typeof studioModelSchema>;
export type StudioSceneData = z.infer<typeof studioSceneSchema>;

export function readScene(storage: Pick<Storage, "getItem">): StudioSceneData {
  const raw = storage.getItem(STUDIO_SCENE_STORAGE_KEY);
  return raw === null ? { version: 1, lights: [], cameras: [], model: null } : studioSceneSchema.parse(JSON.parse(raw));
}

export function writeScene(storage: Pick<Storage, "setItem">, scene: StudioSceneData) {
  storage.setItem(STUDIO_SCENE_STORAGE_KEY, JSON.stringify(studioSceneSchema.parse(scene)));
}

export function nextAssetCounter(assets: Array<{ id: string }>) {
  return assets.reduce((next, asset) => Math.max(next, Number(asset.id.split("-")[1]) + 1), 0);
}
