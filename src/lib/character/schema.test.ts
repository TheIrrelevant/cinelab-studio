/**
 * @file schema.test.ts
 * @description Unit tests for the Character zod schema, factory, and immutable update helpers.
 * @scope cinelab-studio
 * @depends schema.ts, presets.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CharacterSchema,
  createCharacter,
  updateCharacter,
  isValidCharacter,
} from "@/lib/character/schema";
import { BASE_MODELS, HAIR_STYLES, SKIN_TONES } from "@/lib/character/presets";

beforeEach(() => {
  // Deterministic id + timestamps for assertions.
  vi.stubGlobal("crypto", {
    ...crypto,
    randomUUID: () => "char-0001",
  });
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-12T00:00:00Z"));
});

describe("CharacterSchema", () => {
  it("accepts a fully valid character", () => {
    const result = CharacterSchema.safeParse({
      id: "char-0001",
      name: "Aria",
      baseModelId: BASE_MODELS[0].id,
      genderPresentation: "feminine",
      bodyPreset: "athletic",
      skinTone: SKIN_TONES[0].id,
      hairStyle: HAIR_STYLES[0].id,
      hairColor: "#000000",
      faceReferenceImageIds: [],
      notes: "",
      createdAt: "2026-07-12T00:00:00.000Z",
      updatedAt: "2026-07-12T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name (name is required)", () => {
    const result = CharacterSchema.safeParse({
      id: "x",
      name: "  ",
      baseModelId: BASE_MODELS[0].id,
      genderPresentation: "feminine",
      bodyPreset: "athletic",
      skinTone: SKIN_TONES[0].id,
      hairStyle: HAIR_STYLES[0].id,
      hairColor: "#000000",
      faceReferenceImageIds: [],
      notes: "",
      createdAt: "2026-07-12T00:00:00.000Z",
      updatedAt: "2026-07-12T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown baseModelId", () => {
    const result = CharacterSchema.safeParse({
      id: "x",
      name: "Aria",
      baseModelId: "does-not-exist",
      genderPresentation: "feminine",
      bodyPreset: "athletic",
      skinTone: SKIN_TONES[0].id,
      hairStyle: HAIR_STYLES[0].id,
      hairColor: "#000000",
      faceReferenceImageIds: [],
      notes: "",
      createdAt: "2026-07-12T00:00:00.000Z",
      updatedAt: "2026-07-12T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid hairColor hex", () => {
    const result = CharacterSchema.safeParse({
      id: "x",
      name: "Aria",
      baseModelId: BASE_MODELS[0].id,
      genderPresentation: "feminine",
      bodyPreset: "athletic",
      skinTone: SKIN_TONES[0].id,
      hairStyle: HAIR_STYLES[0].id,
      hairColor: "not-a-color",
      faceReferenceImageIds: [],
      notes: "",
      createdAt: "2026-07-12T00:00:00.000Z",
      updatedAt: "2026-07-12T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("createCharacter", () => {
  it("creates a character with defaults for optional appearance fields", () => {
    const c = createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    expect(c.id).toBe("char-0001");
    expect(c.name).toBe("Aria");
    expect(c.baseModelId).toBe(BASE_MODELS[0].id);
    expect(c.faceReferenceImageIds).toEqual([]);
    expect(c.notes).toBe("");
    expect(c.createdAt).toBe(c.updatedAt);
  });

  it("throws on an invalid name", () => {
    expect(() => createCharacter({ name: "", baseModelId: BASE_MODELS[0].id }))
      .toThrow();
  });
});

describe("updateCharacter (immutability)", () => {
  it("returns a new object with the change applied", () => {
    const original = createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    const updated = updateCharacter(original, { name: "Aria II" });
    expect(updated.name).toBe("Aria II");
    expect(original.name).toBe("Aria"); // original untouched
    expect(updated).not.toBe(original);
  });

  it("bumps updatedAt and preserves createdAt and id", () => {
    const original = createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    vi.setSystemTime(new Date("2026-07-13T00:00:00Z"));
    const updated = updateCharacter(original, { notes: "edited" });
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.id).toBe(original.id);
    expect(updated.updatedAt).toBe("2026-07-13T00:00:00.000Z");
    expect(updated.updatedAt).not.toBe(original.updatedAt);
  });
});

describe("isValidCharacter", () => {
  it("returns true for valid data and false for garbage", () => {
    const valid = createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    expect(isValidCharacter(valid)).toBe(true);
    expect(isValidCharacter({ ...valid, name: "" })).toBe(false);
    expect(isValidCharacter({ garbage: true } as unknown)).toBe(false);
  });
});