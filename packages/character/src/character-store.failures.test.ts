/**
 * @file character-store.failures.test.ts
 * @description Unit tests for the character store's reference image cleanup on remove
 *   and for state immutability when a storage write fails.
 * @scope cinelab-studio
 * @depends character-store.ts, repository.ts, presets.ts, core/storage-error
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCharacterStore } from "./character-store";
import { characterRepository } from "./repository";
import { BASE_MODELS } from "./presets";
import { StorageWriteError } from "@cinelab/core/storage-error";

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-12T00:00:00Z"));
  vi.stubGlobal("crypto", {
    ...crypto,
    randomUUID: () => "char-0001",
  });
});

describe("characterStore image cleanup and write failures", () => {
  it("remove deletes the character's reference images", () => {
    const deleteMany = vi.fn(() => 2);
    const store = createCharacterStore(characterRepository, { deleteMany });
    const c = store.getState().createNew({
      name: "Aria",
      baseModelId: BASE_MODELS[0].id,
      faceReferenceImageIds: ["img-a", "img-b"],
    });
    store.getState().remove(c.id);
    expect(deleteMany).toHaveBeenCalledWith(["img-a", "img-b"]);
    expect(store.getState().characters).toEqual([]);
  });

  it("remove still succeeds when image cleanup fails", () => {
    const deleteMany = vi.fn(() => {
      throw new StorageWriteError();
    });
    const store = createCharacterStore(characterRepository, { deleteMany });
    const c = store.getState().createNew({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    expect(() => store.getState().remove(c.id)).not.toThrow();
    expect(characterRepository.findAll()).toEqual([]);
  });

  it("leaves state untouched when a write fails", () => {
    const store = createCharacterStore();
    const c = store.getState().createNew({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    const before = store.getState().characters;
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    try {
      expect(() => store.getState().updateCharacter(c.id, { name: "Aria II" })).toThrow(StorageWriteError);
      expect(() => store.getState().remove(c.id)).toThrow(StorageWriteError);
    } finally {
      setItem.mockRestore();
    }
    expect(store.getState().characters).toBe(before);
  });
});
