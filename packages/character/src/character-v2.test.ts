/**
 * @file character-v2.test.ts
 * @description Character data v2 (plan 2.9): v1 records migrate on parse and in storage, a full
 *   human (modifiers, appearance, size, pose) round-trips through JSON and the repository, invalid
 *   humans are rejected, and the v1 fields follow a human edited in the creator.
 * @scope cinelab-studio
 * @depends schema.ts, human-schema.ts, legacy-mapping.ts, repository.ts
 */

import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SHAPE } from "@cinelab/human/makehuman/shape-model";
import { createHuman, type Human } from "./human-schema";
import { legacyFromHuman } from "./legacy-mapping";
import { characterRepository, STORAGE_KEY } from "./repository";
import { CharacterSchema, createCharacter } from "./schema";

const V1 = {
  id: "old-1",
  name: "Mira",
  baseModelId: "base-aria",
  genderPresentation: "feminine",
  bodyPreset: "plus",
  skinTone: "skin-05",
  hairStyle: "hair-curly",
  hairColor: "#AA3311",
  faceReferenceImageIds: ["img-1"],
  notes: "lead",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-02T00:00:00.000Z",
};

const edited = (): Human => ({
  ...createHuman(),
  shape: { ...DEFAULT_SHAPE, gender: 0.1, cupSize: 0.8, modifiers: { "nose/nose-hump-decr-incr": -0.4, "head/head-oval": 0.7 }, bodyType: { id: "curvy", intensity: 0.6 } },
  appearance: { skinTone: 0.35, eyeColour: "green", hair: "braid01", hairColour: "#c9a46a", eyebrows: "eyebrow003", eyelashes: null },
  size: { heightCm: 171.5, massKg: 63.2 },
  pose: { "upperarm01.L": [0.1, 0.2, -0.3, 0.927], jaw: [0.2, 0, 0, 0.98] },
  rootOffset: [0, -0.12, 0.05],
});

beforeEach(() => window.localStorage.clear());

describe("character data v2", () => {
  it("migrates a v1 record on parse and keeps every v1 field", () => {
    const character = CharacterSchema.parse(V1);
    expect(character.version).toBe(2);
    expect(character).toMatchObject(V1);
    const { shape, appearance, pose, size } = character.human;
    expect(shape.gender).toBe(0);
    expect(shape.african).toBe(1);
    expect(shape.bodyType).toEqual({ id: "heavy", intensity: 1 });
    expect(appearance).toMatchObject({ hair: "afro01", hairColour: "#aa3311" });
    expect(pose).toEqual({});
    expect(size).toBeNull();
  });

  it("maps a tall bald v1 character", () => {
    const { human } = CharacterSchema.parse({ ...V1, bodyPreset: "tall", hairStyle: "hair-bald", genderPresentation: "masculine" });
    expect(human.shape).toMatchObject({ gender: 1, height: 0.7, bodyType: { id: "average" } });
    expect(human.appearance.hair).toBeNull();
  });

  it("round-trips a full human through JSON", () => {
    const character = createCharacter({ name: "Lena", baseModelId: "base-aria", human: edited() });
    expect(CharacterSchema.parse(JSON.parse(JSON.stringify(character)))).toEqual(character);
  });

  it("rejects an invalid human", () => {
    const character = createCharacter({ name: "Lena", baseModelId: "base-aria" });
    expect(CharacterSchema.safeParse({ ...character, human: { ...character.human, shape: { ...character.human.shape, gender: 2 } } }).success).toBe(false);
    expect(CharacterSchema.safeParse({ ...character, human: { ...character.human, pose: { jaw: [0, 0, 1] } } }).success).toBe(false);
    expect(CharacterSchema.safeParse({ ...character, version: 3 }).success).toBe(false);
  });

  it("migrates stored v1 records and writes them back as v2", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([V1]));
    const [loaded] = characterRepository.findAll();
    expect(loaded.version).toBe(2);
    characterRepository.update({ ...loaded, human: edited() });
    const [stored] = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(stored.version).toBe(2);
    expect(characterRepository.findById("old-1")!.human).toEqual(edited());
  });

  it("keeps the v1 fields in step with the human", () => {
    const female = legacyFromHuman(edited());
    expect(female).toMatchObject({ baseModelId: "base-aria", genderPresentation: "feminine", bodyPreset: "plus", hairColor: "#c9a46a" });
    expect(female.skinTone).toBe("skin-03"); // no ethnicity preset matches -> default
    const male = { ...edited(), shape: { ...edited().shape, gender: 1, bodyType: { id: "muscular" as const, intensity: 1 } }, appearance: { ...edited().appearance, hair: "afro01" } };
    expect(legacyFromHuman(male, { ...V1 })).toMatchObject({ genderPresentation: "masculine", baseModelId: "base-leo", bodyPreset: "athletic", hairStyle: "hair-curly", skinTone: "skin-05" });
  });
});
