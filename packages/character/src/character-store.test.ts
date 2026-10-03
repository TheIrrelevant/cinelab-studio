/**
 * @file character-store.test.ts
 * @description Unit tests for the Zustand character store. Verifies load, create,
 *   active selection, update (single source of truth in the list), delete, and
 *   immutable state updates. Uses the store factory for per-test isolation.
 * @scope cinelab-studio
 * @depends character-store.ts, repository.ts, schema.ts, presets.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCharacterStore } from "./character-store";
import { characterRepository } from "./repository";
import { BASE_MODELS } from "./presets";

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-12T00:00:00Z"));
  vi.stubGlobal("crypto", {
    ...crypto,
    randomUUID: () => "char-0001",
  });
});

describe("characterStore", () => {
  it("starts empty and idle", () => {
    const store = createCharacterStore();
    const s = store.getState();
    expect(s.characters).toEqual([]);
    expect(s.activeCharacterId).toBeNull();
    expect(s.status).toBe("idle");
  });

  it("load pulls characters from the repository and sets ready", () => {
    const store = createCharacterStore();
    store.getState().load();
    expect(store.getState().status).toBe("ready");
    expect(store.getState().characters).toEqual([]);
  });

  it("createNew adds a character, persists it, and sets it active", () => {
    const store = createCharacterStore();
    store.getState().load();
    const created = store.getState().createNew({
      name: "Aria",
      baseModelId: BASE_MODELS[0].id,
    });
    expect(created.id).toBe("char-0001");
    const s = store.getState();
    expect(s.characters).toHaveLength(1);
    expect(s.activeCharacterId).toBe(created.id);
    // persisted to localStorage too
    expect(characterRepository.findAll()).toHaveLength(1);
  });

  it("setActive selects and getActive returns the active character", () => {
    const store = createCharacterStore();
    store.getState().load();
    const c = store.getState().createNew({
      name: "Aria",
      baseModelId: BASE_MODELS[0].id,
    });
    store.getState().setActive(null);
    expect(store.getState().activeCharacterId).toBeNull();
    expect(store.getState().getActive()).toBeNull();
    store.getState().setActive(c.id);
    expect(store.getState().getActive()?.id).toBe(c.id);
  });

  it("updateActive patches the active character and keeps a single record", () => {
    const store = createCharacterStore();
    store.getState().load();
    const c = store.getState().createNew({
      name: "Aria",
      baseModelId: BASE_MODELS[0].id,
    });
    vi.setSystemTime(new Date("2026-07-13T00:00:00Z"));
    const updated = store.getState().updateActive({ name: "Aria II" });
    expect(updated?.name).toBe("Aria II");
    expect(updated?.updatedAt).toBe("2026-07-13T00:00:00.000Z");
    const s = store.getState();
    expect(s.characters).toHaveLength(1); // no duplicate
    expect(s.characters[0].name).toBe("Aria II");
    // persisted
    expect(characterRepository.findById(c.id)?.name).toBe("Aria II");
  });

  it("updateActive returns null when no character is active", () => {
    const store = createCharacterStore();
    store.getState().load();
    expect(store.getState().updateActive({ name: "x" })).toBeNull();
  });

  it("updateCharacter updates a non-active character by id", () => {
    const store = createCharacterStore();
    store.getState().load();
    const c1 = store.getState().createNew({
      name: "Aria",
      baseModelId: BASE_MODELS[0].id,
    });
    vi.unstubAllGlobals();
    vi.stubGlobal("crypto", {
      ...crypto,
      randomUUID: () => "char-0002",
    });
    const c2 = store.getState().createNew({
      name: "Leo",
      baseModelId: BASE_MODELS[1].id,
    });
    store.getState().setActive(c1.id);
    vi.setSystemTime(new Date("2026-07-14T00:00:00Z"));
    store.getState().updateCharacter(c2.id, { notes: "side character" });
    expect(store.getState().characters).toHaveLength(2);
    const leo = store.getState().characters.find((x) => x.id === c2.id);
    expect(leo?.notes).toBe("side character");
    expect(store.getState().activeCharacterId).toBe(c1.id); // active unchanged
  });

  it("remove deletes a character and clears active if it was active", () => {
    const store = createCharacterStore();
    store.getState().load();
    const c = store.getState().createNew({
      name: "Aria",
      baseModelId: BASE_MODELS[0].id,
    });
    store.getState().remove(c.id);
    expect(store.getState().characters).toEqual([]);
    expect(store.getState().activeCharacterId).toBeNull();
    expect(characterRepository.findAll()).toEqual([]);
  });

  it("remove does not clear active when deleting a different character", () => {
    const store = createCharacterStore();
    store.getState().load();
    const c1 = store.getState().createNew({
      name: "Aria",
      baseModelId: BASE_MODELS[0].id,
    });
    vi.unstubAllGlobals();
    vi.stubGlobal("crypto", {
      ...crypto,
      randomUUID: () => "char-0002",
    });
    const c2 = store.getState().createNew({
      name: "Leo",
      baseModelId: BASE_MODELS[1].id,
    });
    store.getState().setActive(c1.id);
    store.getState().remove(c2.id);
    expect(store.getState().activeCharacterId).toBe(c1.id);
    expect(store.getState().characters).toHaveLength(1);
  });

  it("state updates are immutable (new array references on mutations)", () => {
    const store = createCharacterStore();
    store.getState().load();
    const before = store.getState().characters;
    store.getState().createNew({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    const after = store.getState().characters;
    expect(after).not.toBe(before);
  });
});
