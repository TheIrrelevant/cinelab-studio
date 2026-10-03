/**
 * @file repository.test.ts
 * @description Unit tests for the localStorage character repository. Verifies CRUD,
 *   immutability of returned records, schema re-validation on read, and corruption
 *   handling (invalid stored data is skipped, not thrown).
 * @scope cinelab-studio
 * @depends repository.ts, schema.ts, presets.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  characterRepository,
  STORAGE_KEY,
} from "@/lib/character/repository";
import { createCharacter } from "@/lib/character/schema";
import { BASE_MODELS } from "@/lib/character/presets";
import { StorageWriteError } from "@/lib/character/storage-error";

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-12T00:00:00Z"));
  vi.stubGlobal("crypto", {
    ...crypto,
    randomUUID: () => "char-0001",
  });
});

describe("characterRepository", () => {
  it("findAll returns empty array when nothing stored", () => {
    expect(characterRepository.findAll()).toEqual([]);
  });

  it("create persists a character and returns a copy", () => {
    const c = createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    const saved = characterRepository.create(c);
    expect(saved).toEqual(c);
    expect(saved).not.toBe(c); // returns a copy, not the input reference
    expect(characterRepository.findAll()).toHaveLength(1);
  });

  it("findById returns the matching character", () => {
    const c = createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    characterRepository.create(c);
    expect(characterRepository.findById(c.id)).toEqual(c);
    expect(characterRepository.findById("missing")).toBeNull();
  });

  it("findById returns a copy, not the stored reference", () => {
    const c = createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    characterRepository.create(c);
    const got = characterRepository.findById(c.id);
    got!.name = "mutated";
    // reading again must be unaffected — internal storage is untouched
    expect(characterRepository.findById(c.id)?.name).toBe("Aria");
  });

  it("update replaces a character by id and bumps updatedAt", () => {
    const c = createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    characterRepository.create(c);
    vi.setSystemTime(new Date("2026-07-13T00:00:00Z"));
    const updated = characterRepository.update({
      ...c,
      name: "Aria II",
      updatedAt: new Date("2026-07-13T00:00:00Z").toISOString(),
    });
    expect(updated.name).toBe("Aria II");
    expect(updated.updatedAt).toBe("2026-07-13T00:00:00.000Z");
    expect(characterRepository.findAll()).toHaveLength(1);
    expect(characterRepository.findById(c.id)?.name).toBe("Aria II");
  });

  it("update throws when the character does not exist", () => {
    const c = createCharacter({ name: "Ghost", baseModelId: BASE_MODELS[0].id });
    expect(() => characterRepository.update(c)).toThrow();
  });

  it("delete removes a character by id", () => {
    const c = createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    characterRepository.create(c);
    expect(characterRepository.delete(c.id)).toBe(true);
    expect(characterRepository.findAll()).toEqual([]);
    expect(characterRepository.delete(c.id)).toBe(false); // already gone
  });

  it("findAll skips invalid stored entries (corruption-tolerant)", () => {
    const c = createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    // Manually write one valid record and one corrupt record to storage.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        c,
        { id: "bad", name: "" /* invalid */ },
      ]),
    );
    const all = characterRepository.findAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(c.id);
  });

  it("findAll returns empty array when storage holds non-JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "not-json{{{");
    expect(characterRepository.findAll()).toEqual([]);
  });

  it("findAll returns copies — mutating a result does not affect storage", () => {
    const c = createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    characterRepository.create(c);
    const [first] = characterRepository.findAll();
    first.name = "mutated";
    expect(characterRepository.findById(c.id)?.name).toBe("Aria");
  });
});

describe("characterRepository write failures", () => {
  it("throws StorageWriteError and keeps the previous data when a write fails", () => {
    const first = createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    characterRepository.create(first);
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    try {
      const second = { ...first, id: "char-0002", name: "Leo" };
      expect(() => characterRepository.create(second)).toThrow(StorageWriteError);
      expect(() => characterRepository.delete(first.id)).toThrow(StorageWriteError);
    } finally {
      setItem.mockRestore();
    }
    expect(characterRepository.findAll().map((c) => c.name)).toEqual(["Aria"]);
  });
});
