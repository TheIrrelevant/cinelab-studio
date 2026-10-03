/**
 * @file scene-storage.test.ts
 * @description Rejects corrupt/versioned saves and tests restored ID allocation and storage failures.
 * @depends scene-storage.ts
 */
import { describe, it, expect, vi } from "vitest";
import { readScene, writeScene, nextAssetCounter, studioSceneSchema, type StudioSceneData } from "./scene-storage";
const light = {
  id: "light-9", position: [0,0,0], homePosition: [0,0,0], rotation: [0,0,0], headRotation: [0,0,0],
  height: 2.4, modifier: "none", softboxWidth: 90, softboxHeight: 60, intensity: 95, spread: 0.62, color: "#ffffff",
};
const camera = {
  id: "camera-4", position: [0,0,0], homePosition: [0,0,0], rotation: [0,0,0], headRotation: [0,0,0],
  height: 1.55, body: "proDslr", lens: "standardZoom", iso: 400, aperture: 2.8, shutterIndex: 12,
  focusDistance: 2, zoomMm: 50, bokeh: 50, filter: "neutral", previewVisible: true,
};
const saved = { version: 1, lights: [light], cameras: [camera] };

describe("scene storage", () => {
  it("restores saves made before characters could be placed with no model", () => {
    expect(readScene({ getItem: () => JSON.stringify(saved) }).model).toBeNull();
  });

  it("round trips a placed character model and rejects malformed ones", () => {
    const model = { characterId: "char-1", position: [1, 0, -1], rotation: [0, 0.5, 0] };
    const scene = readScene({ getItem: () => JSON.stringify({ ...saved, model }) });
    expect(scene.model).toEqual(model);
    expect(studioSceneSchema.safeParse({ ...saved, model: { ...model, characterId: "" } }).success).toBe(false);
    expect(studioSceneSchema.safeParse({ ...saved, model: { characterId: "char-1" } }).success).toBe(false);
  });

  it("restores older lights as bare lights without changing their color or modifier", () => {
    const scene = readScene({ getItem: () => JSON.stringify({ ...saved, lights: [{ ...light, modifier: "softbox", color: "#ef5350" }] }) });
    expect(scene.lights[0]).toMatchObject({ lightType: "bare", modifier: "softbox", color: "#ef5350" });
  });
  it("restores a flash with its independent modifier and keeps the stored bare color", () => {
    const scene = readScene({ getItem: () => JSON.stringify({ ...saved, lights: [{ ...light, lightType: "flash", modifier: "softbox", color: "#ef5350" }] }) });
    expect(scene.lights[0]).toMatchObject({ lightType: "flash", modifier: "softbox", color: "#ef5350" });
    let raw = "";
    writeScene({ setItem: (_key, value) => { raw = value; } }, scene);
    expect(readScene({ getItem: () => raw }).lights[0]).toEqual(scene.lights[0]);
  });
  it("round trips a valid scene and allocates IDs beyond sparse saved IDs", () => {
    const storage = { getItem: () => JSON.stringify(saved), setItem: vi.fn() };
    const scene = readScene(storage);
    expect(nextAssetCounter(scene.lights)).toBe(10);
    expect(nextAssetCounter(scene.cameras)).toBe(5);
    writeScene(storage, scene);
    expect(storage.setItem).toHaveBeenCalledWith("cinelab-studio-scene-v1", JSON.stringify(scene));
  });
  it.each([
    "{bad", "null", JSON.stringify({ ...saved, version: 2 }),
    JSON.stringify({ ...saved, lights: [{...light, position: [0,0]}] }),
    JSON.stringify({ ...saved, lights: [light, light] }),
    JSON.stringify({ ...saved, cameras: [{...camera, lens: "unknown"}] }),
    JSON.stringify({ ...saved, cameras: [{...camera, lens: "prime50", zoomMm: 70}] }),
    JSON.stringify({ ...saved, cameras: [{...camera, aperture: 1.4}] }),
    JSON.stringify({ ...saved, cameras: [{...camera, focusDistance: 0.01}] }),
    JSON.stringify({ ...saved, lights: [{...light, id: "light-9007199254740991"}] }),
  ])("rejects invalid saved data without modifying storage: %s", (raw) => {
    const storage = { getItem: () => raw, setItem: vi.fn(), removeItem: vi.fn() };
    expect(() => readScene(storage)).toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
  it("does not write invalid in-memory payloads", () => {
    const storage = { setItem: vi.fn() };
    expect(() => writeScene(storage, { ...saved, lights: [{...light, height: NaN}] } as StudioSceneData)).toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("propagates unavailable reads and quota failures to the UI", () => {
    expect(() => readScene({ getItem: () => { throw new Error("denied"); } })).toThrow("denied");
    expect(() => writeScene({ setItem: () => { throw new Error("quota"); } }, studioSceneSchema.parse(saved))).toThrow("quota");
  });
});
