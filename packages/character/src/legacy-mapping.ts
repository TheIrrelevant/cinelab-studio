/**
 * @file legacy-mapping.ts
 * @description Bridges the v1 character fields (base model, gender presentation, body preset, skin
 *   tone swatch, hairstyle, hair colour) and the v2 MakeHuman human (plan 2.9). `humanFromLegacy`
 *   migrates old characters; `legacyFromHuman` keeps the v1 fields (library swatches, studio
 *   mannequin until plan 4.1) in step with a human edited in the creator.
 * @scope cinelab-studio
 * @depends ./human-schema, @cinelab/human (appearance, ethnic-presets, shape-model, body-types)
 */

import { DEFAULT_APPEARANCE } from "@cinelab/human/makehuman/appearance";
import type { BodyTypeId } from "@cinelab/human/makehuman/body-types";
import { applyEthnicPreset, matchEthnicPreset, type EthnicPresetId } from "@cinelab/human/makehuman/ethnic-presets";
import { DEFAULT_SHAPE } from "@cinelab/human/makehuman/shape-model";
import { createHuman, type Human, type HumanShape } from "./human-schema";

export type LegacyFields = {
  baseModelId: string;
  genderPresentation: string;
  bodyPreset: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
};

const GENDER: Record<string, number> = { feminine: 0, masculine: 1, androgynous: 0.5 };
const ETHNICITY_BY_SKIN: Record<string, EthnicPresetId> = {
  "skin-01": "european",
  "skin-02": "european",
  "skin-03": "asian",
  "skin-04": "latin",
  "skin-05": "african",
  "skin-06": "african",
};
const SKIN_BY_ETHNICITY: Record<EthnicPresetId, string> = { european: "skin-02", asian: "skin-03", latin: "skin-04", african: "skin-05" };
const HAIR_BY_STYLE: Record<string, string | null> = {
  "hair-bald": null,
  "hair-short": "short02",
  "hair-medium": "bob01",
  "hair-long": "long01",
  "hair-bun": "ponytail01",
  "hair-curly": "afro01",
};
const BODY_TYPE_BY_PRESET: Record<string, BodyTypeId> = { slim: "slim", athletic: "athletic", average: "average", plus: "heavy", tall: "average" };
const PRESET_BY_BODY_TYPE: Record<BodyTypeId, string> = {
  slim: "slim",
  average: "average",
  athletic: "athletic",
  muscular: "athletic",
  curvy: "plus",
  soft: "plus",
  heavy: "plus",
};

/** The v2 human closest to a v1 character (rest pose; the creator re-measures the size). */
export function humanFromLegacy(legacy: LegacyFields): Human {
  const gender = GENDER[legacy.genderPresentation] ?? 0.5;
  const ethnicity = ETHNICITY_BY_SKIN[legacy.skinTone] ?? "european";
  const loaded = applyEthnicPreset({ ...DEFAULT_SHAPE, gender }, DEFAULT_APPEARANCE, ethnicity);
  const shape: HumanShape = {
    ...loaded.shape,
    height: legacy.bodyPreset === "tall" ? 0.7 : loaded.shape.height,
    bodyType: { id: BODY_TYPE_BY_PRESET[legacy.bodyPreset] ?? "average", intensity: 1 },
  };
  const hair = legacy.hairStyle in HAIR_BY_STYLE ? HAIR_BY_STYLE[legacy.hairStyle] : loaded.appearance.hair;
  return createHuman(shape, { ...loaded.appearance, hair, hairColour: legacy.hairColor.toLowerCase() });
}

const genderPresentation = (gender: number) => (gender < 1 / 3 ? "feminine" : gender > 2 / 3 ? "masculine" : "androgynous");
const BASE_MODEL: Record<string, string> = { feminine: "base-aria", masculine: "base-leo", androgynous: "base-rin" };

/** v1 fields that describe `human`; `previous` supplies what the human cannot express. */
export function legacyFromHuman(human: Human, previous?: LegacyFields): LegacyFields {
  const presentation = genderPresentation(human.shape.gender);
  const ethnicity = matchEthnicPreset(human.shape);
  const hairStyle = Object.entries(HAIR_BY_STYLE).find(([, hair]) => hair === human.appearance.hair)?.[0];
  return {
    baseModelId: BASE_MODEL[presentation],
    genderPresentation: presentation,
    bodyPreset: PRESET_BY_BODY_TYPE[human.shape.bodyType.id],
    skinTone: ethnicity ? SKIN_BY_ETHNICITY[ethnicity] : (previous?.skinTone ?? "skin-03"),
    hairStyle: hairStyle ?? previous?.hairStyle ?? "hair-medium",
    hairColor: human.appearance.hairColour,
  };
}
