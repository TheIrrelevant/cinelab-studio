/**
 * @file mannequin.ts
 * @description Derives placeholder mannequin proportions and colours from a saved
 *   character so the studio can show the active character before real avatars exist.
 * @scope cinelab-studio
 * @depends character/schema.ts, character/presets.ts
 */

import type { Character } from "@/lib/character/schema";
import { getSkinTone, type BodyPreset, type GenderPresentation } from "@/lib/character/presets";

export type HairShape = "none" | "cap" | "bob" | "long" | "bun" | "curly";

export type MannequinSpec = {
  /** Standing height in metres. */
  height: number;
  /** Horizontal scale for torso, hips and limbs. */
  girth: number;
  /** Shoulder width relative to hips. */
  shoulderRatio: number;
  skin: string;
  hairColor: string;
  hair: HairShape;
};

const BODY: Record<BodyPreset | string, { height: number; girth: number }> = {
  slim: { height: 1.7, girth: 0.86 },
  athletic: { height: 1.76, girth: 1.02 },
  average: { height: 1.72, girth: 1 },
  plus: { height: 1.7, girth: 1.26 },
  tall: { height: 1.88, girth: 0.96 },
};

const SHOULDERS: Record<GenderPresentation | string, number> = {
  feminine: 0.92,
  masculine: 1.12,
  androgynous: 1,
};

const HAIR: Record<string, HairShape> = {
  "hair-bald": "none",
  "hair-short": "cap",
  "hair-medium": "bob",
  "hair-long": "long",
  "hair-bun": "bun",
  "hair-curly": "curly",
};

const FALLBACK_SKIN = "#d4a373";

export function mannequinSpec(character: Character): MannequinSpec {
  const body = BODY[character.bodyPreset] ?? BODY.average;
  return {
    height: body.height,
    girth: body.girth,
    shoulderRatio: SHOULDERS[character.genderPresentation] ?? 1,
    skin: getSkinTone(character.skinTone)?.hex ?? FALLBACK_SKIN,
    hairColor: character.hairColor,
    hair: HAIR[character.hairStyle] ?? "cap",
  };
}
