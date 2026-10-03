/**
 * @file mannequin.test.ts
 * @description Tests mapping saved characters to placeholder mannequin proportions.
 * @scope cinelab-studio
 * @depends ./mannequin
 */

import { describe, expect, it } from "vitest";
import { createCharacter } from "@/lib/character/schema";
import { BASE_MODELS, SKIN_TONES } from "@/lib/character/presets";
import { mannequinSpec } from "./mannequin";

const base = { name: "Aria", baseModelId: BASE_MODELS[0].id };

describe("mannequinSpec", () => {
  it("uses the character's skin tone and hair colour", () => {
    const spec = mannequinSpec(createCharacter({ ...base, skinTone: SKIN_TONES[4].id, hairColor: "#aa3311" }));
    expect(spec.skin).toBe(SKIN_TONES[4].hex);
    expect(spec.hairColor).toBe("#aa3311");
  });

  it("varies height and girth by body preset", () => {
    const tall = mannequinSpec(createCharacter({ ...base, bodyPreset: "tall" }));
    const plus = mannequinSpec(createCharacter({ ...base, bodyPreset: "plus" }));
    const slim = mannequinSpec(createCharacter({ ...base, bodyPreset: "slim" }));
    expect(tall.height).toBeGreaterThan(plus.height);
    expect(plus.girth).toBeGreaterThan(slim.girth);
  });

  it("widens shoulders for masculine presentation and maps hair styles", () => {
    const masc = mannequinSpec(createCharacter({ ...base, genderPresentation: "masculine", hairStyle: "hair-bald" }));
    const fem = mannequinSpec(createCharacter({ ...base, genderPresentation: "feminine", hairStyle: "hair-bun" }));
    expect(masc.shoulderRatio).toBeGreaterThan(fem.shoulderRatio);
    expect(masc.hair).toBe("none");
    expect(fem.hair).toBe("bun");
  });
});
