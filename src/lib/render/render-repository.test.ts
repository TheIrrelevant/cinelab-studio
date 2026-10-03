/**
 * @file render-repository.test.ts
 * @description Tests render history storage: enqueue, lifecycle-checked updates, lookup and failures.
 * @scope cinelab-studio
 * @depends render-repository.ts, scene-json.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { StorageWriteError } from "@/lib/character/storage-error";
import { createCharacter } from "@/lib/character/schema";
import { BASE_MODELS } from "@/lib/character/presets";
import { studioSceneSchema } from "@/lib/studio/scene-storage";
import { renderError, type RenderRequest } from "./contract";
import { createRenderRepository, RENDER_STORAGE_KEY } from "./render-repository";
import { buildRenderRequest, buildSceneJson } from "./scene-json";

const character = createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id });

async function request(id: string, createdAt: string, backdrop: "gray" | "black" = "gray"): Promise<RenderRequest> {
  const scene = studioSceneSchema.parse({
    version: 1,
    lights: [{ id: "light-0", position: [0, 0, 1], homePosition: [0, 0, 1], rotation: [0, 0, 0], headRotation: [0, 0, 0], height: 2.4, modifier: "none", softboxWidth: 90, softboxHeight: 60, intensity: 95, spread: 0.62, color: "#ffffff" }],
    cameras: [{ id: "camera-0", position: [0, 0, 2], homePosition: [0, 0, 2], rotation: [0, Math.PI, 0], headRotation: [0, 0, 0], height: 1.55, body: "proDslr", lens: "standardZoom", iso: 400, aperture: 2.8, shutterIndex: 12, focusDistance: 2, zoomMm: 50, filter: "neutral", previewVisible: true }],
    model: { characterId: character.id, position: [0, 0, -1], rotation: [0, 0, 0] },
    backdrop: { color: backdrop },
  });
  const built = buildSceneJson(scene, [character]);
  if (!built.ok) throw new Error(built.issues.join());
  return buildRenderRequest(built.scene, { kind: "preview", id, now: new Date(createdAt) });
}

let repo: ReturnType<typeof createRenderRepository>;
beforeEach(() => {
  window.localStorage.clear();
  repo = createRenderRepository();
});

describe("renderRepository", () => {
  it("enqueues requests and lists newest first", async () => {
    repo.enqueue(await request("render-1", "2026-10-03T10:00:00Z"));
    const second = repo.enqueue(await request("render-2", "2026-10-03T11:00:00Z"), new Date("2026-10-03T11:00:01Z"));
    expect(second.result).toMatchObject({ status: "queued", queuedAt: "2026-10-03T11:00:01.000Z", provider: null });
    expect(repo.list().map((r) => r.request.id)).toEqual(["render-2", "render-1"]);
    await expect(async () => repo.enqueue(await request("render-1", "2026-10-03T12:00:00Z"))).rejects.toThrow(/already exists/);
  });

  it("stores provider params and outputs with the exact scene for reproducibility", async () => {
    const req = await request("render-1", "2026-10-03T10:00:00Z");
    repo.enqueue(req);
    repo.update("render-1", { status: "running", startedAt: "2026-10-03T10:00:05.000Z", provider: { id: "test-provider", model: "m-1", params: { steps: 30 } } });
    repo.update("render-1", { status: "succeeded", completedAt: "2026-10-03T10:00:30.000Z", outputs: [{ uri: "asset-1", width: 1024, height: 576, mimeType: "image/png" }] });
    const fresh = createRenderRepository().findById("render-1");
    expect(fresh?.request.scene).toEqual(req.scene);
    expect(fresh?.result).toMatchObject({ status: "succeeded", provider: { params: { steps: 30 } }, outputs: [{ uri: "asset-1" }] });
  });

  it("rejects status changes the lifecycle forbids and invalid failures", async () => {
    repo.enqueue(await request("render-1", "2026-10-03T10:00:00Z"));
    expect(() => repo.update("render-1", { status: "succeeded" })).toThrow(/Cannot move/);
    expect(() => repo.update("render-1", { status: "failed" })).toThrow();
    repo.update("render-1", { status: "failed", error: renderError("provider_unavailable", "Provider is offline. Try again shortly.") });
    expect(() => repo.update("render-1", { status: "running" })).toThrow(/Cannot move/);
    expect(() => repo.update("missing", { status: "running" })).toThrow(/No render request/);
  });

  it("finds renders of the same scene by hash", async () => {
    const a = await request("render-1", "2026-10-03T10:00:00Z");
    const b = await request("render-2", "2026-10-03T11:00:00Z");
    const c = await request("render-3", "2026-10-03T12:00:00Z", "black");
    [a, b, c].forEach((r) => repo.enqueue(r));
    expect(repo.findBySceneHash(a.sceneHash).map((r) => r.request.id).sort()).toEqual(["render-1", "render-2"]);
  });

  it("skips corrupt entries and surfaces write failures", async () => {
    window.localStorage.setItem(RENDER_STORAGE_KEY, JSON.stringify([{ nope: true }]));
    expect(repo.list()).toEqual([]);
    window.localStorage.setItem(RENDER_STORAGE_KEY, "not json");
    expect(repo.list()).toEqual([]);
    const req = await request("render-1", "2026-10-03T10:00:00Z");
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    try {
      expect(() => repo.enqueue(req)).toThrow(StorageWriteError);
    } finally {
      setItem.mockRestore();
    }
  });
});
