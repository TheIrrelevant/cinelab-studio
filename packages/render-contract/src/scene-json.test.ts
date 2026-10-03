/**
 * @file scene-json.test.ts
 * @description Tests SceneJSON building, provider neutrality, canonical hashing and render requests.
 * @scope cinelab-studio
 * @depends scene-json.ts, contract.ts
 */

import { describe, expect, it } from "vitest";
import { createCharacter } from "@cinelab/character/schema";
import { BASE_MODELS } from "@cinelab/character/presets";
import { lightRolePlacement } from "@cinelab/studio/light-presets";
import { framingPlacement } from "@cinelab/studio/framing";
import { lensOriginOffset } from "@cinelab/studio/camera-rig";
import { studioSceneSchema, type StudioSceneData } from "@cinelab/studio/scene-storage";
import { renderRequestSchema, sceneJsonSchema } from "./contract";
import { buildRenderRequest, buildSceneJson, canonicalJson, hashScene, pickRenderCamera } from "./scene-json";

const character = createCharacter({
  name: "Aria",
  baseModelId: BASE_MODELS[0].id,
  skinTone: "skin-04",
  hairStyle: "hair-bun",
  hairColor: "#3B2414",
  faceReferenceImageIds: ["img-1"],
});
const subject = { position: [0, 0, -1] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] };

function light(id: string, role: "key" | "fill" | "rim", extra: Partial<StudioSceneData["lights"][number]> = {}) {
  return {
    id, lightType: "bare" as const, color: "#ffffff", colorTemperature: null,
    ...lightRolePlacement(role, subject),
    ...extra,
  };
}

function scene(overrides: Partial<StudioSceneData> = {}): StudioSceneData {
  const camera = {
    id: "camera-0", body: "proDslr", iso: 400, shutterIndex: 12, filter: "neutral", previewVisible: true,
    ...framingPlacement("halfBody", subject, 1.72, 2.8, (lens, zoom) => lensOriginOffset("proDslr", lens, zoom)),
  };
  return studioSceneSchema.parse({
    version: 1,
    lights: [light("light-0", "key", { colorTemperature: 3200, color: "#ffb87b" }), light("light-1", "rim", { lightType: "flash" })],
    cameras: [camera],
    model: { ...subject, characterId: character.id, pose: "relaxed" },
    backdrop: { color: "white" },
    ...overrides,
  });
}

describe("buildSceneJson", () => {
  it("includes character, outfit, camera, lighting, pose and backdrop", () => {
    const result = buildSceneJson(scene(), [character]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const json = result.scene;
    expect(sceneJsonSchema.safeParse(json).success).toBe(true);
    expect(json.character).toMatchObject({ name: "Aria", skinTone: { id: "skin-04", label: "Tan" }, hair: { label: "Bun", color: "#3b2414" }, faceReferenceImageIds: ["img-1"] });
    expect(json.outfit).toEqual({ items: [] });
    expect(json.subject.pose).toEqual({ preset: "relaxed", label: "Relaxed" });
    expect(json.camera).toMatchObject({ lens: { id: "standardZoom" }, focalLengthMm: 50, framing: "halfBody", shutter: { label: "1/125", seconds: 1 / 125 } });
    expect(json.backdrop).toEqual({ kind: "seamless-paper", color: "white", hex: "#e8e8e4" });
    expect(json.lights.map((l) => l.role)).toEqual(["key", "rim"]);
  });

  it("describes lights relative to the subject and the camera distance from the lens", () => {
    const result = buildSceneJson(scene(), [character]);
    if (!result.ok) throw new Error(result.issues.join());
    const [key, rim] = result.scene.lights;
    // Key sits camera-left in front: subject's right, negative azimuth.
    expect(key.relativeToSubject.azimuthDeg).toBeGreaterThan(-90);
    expect(key.relativeToSubject.azimuthDeg).toBeLessThan(0);
    expect(Math.abs(rim.relativeToSubject.azimuthDeg)).toBeGreaterThan(90);
    expect(key.relativeToSubject.elevationDeg).toBeGreaterThan(0);
    expect(key).toMatchObject({ type: "continuous", colorTemperatureK: 3200, modifier: { kind: "softbox", widthCm: 120 } });
    expect(rim).toMatchObject({ type: "flash", colorTemperatureK: 5600, color: "#ffeee3", effectivePower: 275 });
    expect(result.scene.camera.distanceToSubjectM).toBeCloseTo(result.scene.camera.focusDistanceM, 1);
  });

  it("lists everything missing instead of building a partial scene", () => {
    const result = buildSceneJson(scene({ model: null, cameras: [], lights: [] }), [character]);
    expect(result).toEqual({
      ok: false,
      issues: ["Place a character in the studio (Model tool).", "Add a camera to frame the shot.", "Add at least one light."],
    });
    expect(buildSceneJson(scene(), []).ok).toBe(false);
    expect(buildSceneJson(scene(), [character], { cameraId: "camera-9" })).toEqual({ ok: false, issues: ["Camera camera-9 does not exist."] });
  });

  it("contains no provider-specific fields", () => {
    const result = buildSceneJson(scene(), [character]);
    const text = JSON.stringify(result.ok ? result.scene : null).toLowerCase();
    for (const word of ["replicate", "fal", "comfy", "openai", "anthropic", "gemini", "flux", "prompt"]) {
      expect(text).not.toContain(`"${word}`);
    }
  });
});

describe("pickRenderCamera", () => {
  it("prefers the requested camera, then a visible preview, then the first", () => {
    const a = { id: "camera-0", previewVisible: false } as StudioSceneData["cameras"][number];
    const b = { id: "camera-1", previewVisible: true } as StudioSceneData["cameras"][number];
    expect(pickRenderCamera([a, b])?.id).toBe("camera-1");
    expect(pickRenderCamera([a, b], "camera-0")?.id).toBe("camera-0");
    expect(pickRenderCamera([a])?.id).toBe("camera-0");
    expect(pickRenderCamera([])).toBeUndefined();
  });
});

describe("hashing and render requests", () => {
  it("serialises keys in a stable order", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { f: 1, e: 0 }], c: null } })).toBe('{"a":{"c":null,"d":[2,{"e":0,"f":1}]},"b":1}');
  });

  it("hashes identical scenes identically and different scenes differently", async () => {
    const first = buildSceneJson(scene(), [character]);
    const again = buildSceneJson(scene(), [character]);
    const other = buildSceneJson(scene({ backdrop: { color: "black" } }), [character]);
    if (!first.ok || !again.ok || !other.ok) throw new Error("scene incomplete");
    const hash = await hashScene(first.scene);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashScene(again.scene)).toBe(hash);
    expect(await hashScene(other.scene)).not.toBe(hash);
  });

  it("builds valid preview and final requests from the same scene", async () => {
    const built = buildSceneJson(scene(), [character]);
    if (!built.ok) throw new Error("scene incomplete");
    const now = new Date("2026-10-03T12:00:00Z");
    const preview = await buildRenderRequest(built.scene, { kind: "preview", id: "render-1", now });
    const final = await buildRenderRequest(built.scene, { kind: "final", id: "render-2", now, seed: 42 });
    expect(renderRequestSchema.safeParse(preview).success).toBe(true);
    expect(preview).toMatchObject({ id: "render-1", createdAt: "2026-10-03T12:00:00.000Z", output: { width: 1024, height: 576 }, seed: null });
    expect(final).toMatchObject({ output: { width: 3840, height: 2160 }, seed: 42 });
    expect(final.sceneHash).toBe(preview.sceneHash);
  });
});
