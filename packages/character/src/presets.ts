/**
 * @file presets.ts
 * @description Fixed preset catalogs for the character editor: base models, gender
 *   presentation, body presets, skin tones, and hair styles. These are the only
 *   selectable values the editor allows in Phase 1 (constrained input, not free text).
 * @scope cinelab-studio
 */

export type GenderPresentation = "feminine" | "masculine" | "androgynous";

export type BodyPreset = "slim" | "athletic" | "average" | "plus" | "tall";

export interface BaseModel {
  readonly id: string;
  readonly label: string;
  readonly genderPresentation: GenderPresentation;
}

export interface SkinTone {
  readonly id: string;
  readonly label: string;
  readonly hex: string;
}

export interface HairStyle {
  readonly id: string;
  readonly label: string;
}

export const GENDER_PRESENTATIONS: readonly GenderPresentation[] = [
  "feminine",
  "masculine",
  "androgynous",
];

export const BODY_PRESETS: readonly BodyPreset[] = [
  "slim",
  "athletic",
  "average",
  "plus",
  "tall",
];

export const BASE_MODELS: readonly BaseModel[] = [
  { id: "base-aria", label: "Aria", genderPresentation: "feminine" },
  { id: "base-leo", label: "Leo", genderPresentation: "masculine" },
  { id: "base-rin", label: "Rin", genderPresentation: "androgynous" },
];

export const SKIN_TONES: readonly SkinTone[] = [
  { id: "skin-01", label: "Porcelain", hex: "#f3d9c6" },
  { id: "skin-02", label: "Ivory", hex: "#eac4a8" },
  { id: "skin-03", label: "Sand", hex: "#d4a373" },
  { id: "skin-04", label: "Tan", hex: "#b07d56" },
  { id: "skin-05", label: "Espresso", hex: "#7a4f30" },
  { id: "skin-06", label: "Onyx", hex: "#4a3220" },
];

export const HAIR_STYLES: readonly HairStyle[] = [
  { id: "hair-bald", label: "Bald" },
  { id: "hair-short", label: "Short" },
  { id: "hair-medium", label: "Medium" },
  { id: "hair-long", label: "Long" },
  { id: "hair-bun", label: "Bun" },
  { id: "hair-curly", label: "Curly" },
];

export const BASE_MODEL_IDS = BASE_MODELS.map((m) => m.id) as readonly string[];
export const SKIN_TONE_IDS = SKIN_TONES.map((t) => t.id) as readonly string[];
export const HAIR_STYLE_IDS = HAIR_STYLES.map((s) => s.id) as readonly string[];

export function getBaseModel(id: string): BaseModel | undefined {
  return BASE_MODELS.find((m) => m.id === id);
}

export function getSkinTone(id: string): SkinTone | undefined {
  return SKIN_TONES.find((t) => t.id === id);
}

export function getHairStyle(id: string): HairStyle | undefined {
  return HAIR_STYLES.find((s) => s.id === id);
}