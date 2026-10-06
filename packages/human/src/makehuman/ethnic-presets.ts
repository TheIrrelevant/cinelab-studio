/**
 * @file ethnic-presets.ts
 * @description Ethnicity presets (plan 2.5, decision D3): Asian, African, European, Latin. Choosing
 *   one loads a standard model - the ethnicity mix of the three MakeHuman axes, a skin tone, eye
 *   colour, hairstyle per gender and hair colour - and clears the head modifiers, so customisation
 *   starts from that model. Body shape (gender, height, weight, body type, body regions) is kept.
 *   A preset is a starting point only; every value stays editable.
 * @scope cinelab-studio
 * @depends ./macro, ./appearance, ./modifier-catalogue, ./shape-model (types)
 */

import type { Appearance } from "./appearance";
import type { BodyParams } from "./macro";
import { HEAD_GROUPS } from "./modifier-catalogue";
import type { ShapeParams } from "./shape-model";

export const ETHNIC_PRESET_IDS = ["asian", "african", "european", "latin"] as const;
export type EthnicPresetId = (typeof ETHNIC_PRESET_IDS)[number];

type Mix = Pick<BodyParams, "african" | "asian" | "caucasian">;
export type EthnicPreset = {
  label: string;
  mix: Mix;
  skinTone: number;
  eyeColour: string;
  hair: { female: string; male: string };
  hairColour: string;
};

export const ETHNIC_PRESETS: Readonly<Record<EthnicPresetId, EthnicPreset>> = {
  asian: {
    label: "Asian",
    mix: { african: 0, asian: 1, caucasian: 0 },
    skinTone: 0.5,
    eyeColour: "brown",
    hair: { female: "long01", male: "short01" },
    hairColour: "#141110",
  },
  african: {
    label: "African",
    mix: { african: 1, asian: 0, caucasian: 0 },
    skinTone: 0.5,
    eyeColour: "brown",
    hair: { female: "afro01", male: "short01" },
    hairColour: "#141110",
  },
  european: {
    label: "European",
    mix: { african: 0, asian: 0, caucasian: 1 },
    skinTone: 0.5,
    eyeColour: "blue",
    hair: { female: "ponytail01", male: "short02" },
    hairColour: "#6a4630",
  },
  latin: {
    label: "Latin",
    mix: { african: 0.15, asian: 0.2, caucasian: 0.65 },
    skinTone: 0.42,
    eyeColour: "brown",
    hair: { female: "long01", male: "short02" },
    hairColour: "#3b2a20",
  },
};

const isHeadModifier = (id: string) => HEAD_GROUPS.includes(id.split("/")[0]);

/** The preset this body's mix matches exactly, or null once the mix was edited. */
export function matchEthnicPreset(params: Mix): EthnicPresetId | null {
  return ETHNIC_PRESET_IDS.find((id) => (["african", "asian", "caucasian"] as const).every((k) => Math.abs(ETHNIC_PRESETS[id].mix[k] - params[k]) < 1e-9)) ?? null;
}

/** Loads a preset: ethnicity mix and appearance from the preset, head modifiers cleared, body kept. */
export function applyEthnicPreset<T extends ShapeParams>(shape: T, appearance: Appearance, id: EthnicPresetId): { shape: T; appearance: Appearance } {
  const preset = ETHNIC_PRESETS[id];
  const modifiers = Object.fromEntries(Object.entries(shape.modifiers ?? {}).filter(([key]) => !isHeadModifier(key)));
  return {
    shape: { ...shape, ...preset.mix, modifiers },
    appearance: {
      ...appearance,
      skinTone: preset.skinTone,
      eyeColour: preset.eyeColour,
      hair: shape.gender >= 0.5 ? preset.hair.male : preset.hair.female,
      hairColour: preset.hairColour,
    },
  };
}
