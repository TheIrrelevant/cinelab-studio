/**
 * @file appearance.ts
 * @description Surface appearance of the MakeHuman body: skin tone, eye colour, hairstyle and
 *   colour, eyebrows and eyelashes. The skin texture blends the six young skins with the same
 *   ethnicity and gender weights that shape the body.
 * @scope cinelab-studio
 * @depends ./macro
 */

import type { BodyParams } from "./macro";

export type Appearance = {
  /** 0 = darker, 0.5 = texture as painted, 1 = lighter. */
  skinTone: number;
  /** Eye colour name from the proxy manifest, e.g. "brown". */
  eyeColour: string;
  /** Hairstyle name, or null for none. */
  hair: string | null;
  /** sRGB hex colour applied to hair and (darker) eyebrows. */
  hairColour: string;
  eyebrows: string | null;
  eyelashes: string | null;
};

export const DEFAULT_APPEARANCE: Appearance = {
  skinTone: 0.5,
  eyeColour: "brown",
  hair: "short02",
  hairColour: "#3b2a20",
  eyebrows: "eyebrow001",
  eyelashes: "eyelashes01",
};

export const HAIR_COLOURS: Array<{ id: string; label: string; hex: string }> = [
  { id: "black", label: "Black", hex: "#141110" },
  { id: "dark-brown", label: "Dark brown", hex: "#3b2a20" },
  { id: "brown", label: "Brown", hex: "#6a4630" },
  { id: "auburn", label: "Auburn", hex: "#8a3b1f" },
  { id: "blonde", label: "Blonde", hex: "#c9a46a" },
  { id: "platinum", label: "Platinum", hex: "#e4dccb" },
  { id: "grey", label: "Grey", hex: "#9a9792" },
];

/** Choices available in the generated assets, for building appearance UIs. */
export type AppearanceCatalog = { hair: string[]; eyebrows: string[]; eyelashes: string[]; eyeColours: string[] };

export function appearanceCatalog(manifest: { proxies: Array<{ kind: string; name: string }>; eyeColours: string[] }): AppearanceCatalog {
  const names = (kind: string) => manifest.proxies.filter((p) => p.kind === kind).map((p) => p.name);
  return { hair: names("hair"), eyebrows: names("eyebrows"), eyelashes: names("eyelashes"), eyeColours: manifest.eyeColours };
}

/** Weight per skin name ("<ethnicity>-<gender>"), matching the body's macro weights. */
export function skinWeights(params: BodyParams): Map<string, number> {
  const ethnic = { african: Math.max(0, params.african), asian: Math.max(0, params.asian), caucasian: Math.max(0, params.caucasian) };
  const total = ethnic.african + ethnic.asian + ethnic.caucasian;
  const male = Math.min(1, Math.max(0, params.gender));
  const weights = new Map<string, number>();
  for (const [ethnicity, value] of Object.entries(ethnic)) {
    const share = total > 0 ? value / total : 1 / 3;
    for (const [gender, genderWeight] of [["female", 1 - male], ["male", male]] as const) {
      if (share * genderWeight > 1e-4) weights.set(`${ethnicity}-${gender}`, share * genderWeight);
    }
  }
  return weights;
}

/** Multiplier for the skin texture: 0.55 (darker) .. 1 .. 1.3 (lighter). */
export function skinToneFactor(tone: number): number {
  const t = Math.min(1, Math.max(0, tone));
  return t < 0.5 ? 0.55 + t * 0.9 : 1 + (t - 0.5) * 0.6;
}
