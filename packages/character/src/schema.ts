/**
 * @file schema.ts
 * @description Character data model: zod schema, TypeScript type, factory, and
 *   immutable update helper. Single source of truth for the character shape.
 *   Never trust external data — every Character entering the app from storage is
 *   re-validated through CharacterSchema.
 *   Version 2 (plan 2.9) adds `human` (MakeHuman shape, appearance, size, pose). Records without a
 *   version are v1 and migrate on parse: their human is derived from the v1 fields.
 * @scope cinelab-studio
 * @depends presets.ts, human-schema.ts, legacy-mapping.ts
 */

import { z } from "zod";
import {
  BASE_MODEL_IDS,
  BODY_PRESETS,
  GENDER_PRESENTATIONS,
  HAIR_STYLE_IDS,
  SKIN_TONE_IDS,
} from "./presets";
import { HumanSchema } from "./human-schema";
import { humanFromLegacy, type LegacyFields } from "./legacy-mapping";

const hexColor = /^#[0-9a-fA-F]{6}$/;

export const CHARACTER_VERSION = 2;

const CharacterV2Schema = z.object({
  version: z.literal(CHARACTER_VERSION),
  id: z.string().min(1),
  name: z.string().trim().min(1, "Name is required"),
  baseModelId: z.enum(BASE_MODEL_IDS as [string, ...string[]]),
  genderPresentation: z.enum(GENDER_PRESENTATIONS as [string, ...string[]]),
  bodyPreset: z.enum(BODY_PRESETS as [string, ...string[]]),
  skinTone: z.enum(SKIN_TONE_IDS as [string, ...string[]]),
  hairStyle: z.enum(HAIR_STYLE_IDS as [string, ...string[]]),
  hairColor: z.string().regex(hexColor, "hairColor must be a #rrggbb hex"),
  faceReferenceImageIds: z.array(z.string().min(1)).default([]),
  notes: z.string().default(""),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  human: HumanSchema,
});

const LEGACY_KEYS = ["baseModelId", "genderPresentation", "bodyPreset", "skinTone", "hairStyle", "hairColor"] as const;

/** v1 record (no version, all legacy fields are strings) -> v2 record; anything else unchanged. */
function migrate(data: unknown): unknown {
  if (typeof data !== "object" || data === null || "version" in data) return data;
  const record = data as Record<string, unknown>;
  if (!LEGACY_KEYS.every((key) => typeof record[key] === "string")) return data;
  try {
    return { ...record, version: CHARACTER_VERSION, human: humanFromLegacy(record as unknown as LegacyFields) };
  } catch {
    // Invalid v1 values (e.g. a bad hair colour): leave the record for the schema to reject.
    return data;
  }
}

export const CharacterSchema = z.preprocess(migrate, CharacterV2Schema);

export type Character = z.infer<typeof CharacterV2Schema>;

export type CharacterInput = Pick<Character, "name" | "baseModelId"> &
  Partial<
    Pick<
      Character,
      | "genderPresentation"
      | "bodyPreset"
      | "skinTone"
      | "hairStyle"
      | "hairColor"
      | "faceReferenceImageIds"
      | "notes"
      | "human"
    >
  >;

export type CharacterPatch = Partial<
  Pick<
    Character,
    | "name"
    | "baseModelId"
    | "genderPresentation"
    | "bodyPreset"
    | "skinTone"
    | "hairStyle"
    | "hairColor"
    | "faceReferenceImageIds"
    | "notes"
    | "human"
  >
>;

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(): string {
  // crypto.randomUUID is available in browser and Node 19+.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `char-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultGenderFor(baseModelId: string): string {
  return BASE_MODEL_DEFAULTS[baseModelId] ?? "androgynous";
}

// Avoid importing the array's objects here; map preset ids to a default gender.
const BASE_MODEL_DEFAULTS: Record<string, string> = {
  "base-aria": "feminine",
  "base-leo": "masculine",
  "base-rin": "androgynous",
};

export function createCharacter(input: CharacterInput): Character {
  const timestamp = nowIso();
  const legacy: LegacyFields = {
    baseModelId: input.baseModelId,
    genderPresentation: input.genderPresentation ?? defaultGenderFor(input.baseModelId),
    bodyPreset: input.bodyPreset ?? "average",
    skinTone: input.skinTone ?? "skin-03",
    hairStyle: input.hairStyle ?? "hair-medium",
    hairColor: input.hairColor ?? "#1a1a1a",
  };
  const draft = {
    version: CHARACTER_VERSION,
    id: generateId(),
    name: input.name,
    ...legacy,
    faceReferenceImageIds: input.faceReferenceImageIds ?? [],
    notes: input.notes ?? "",
    createdAt: timestamp,
    updatedAt: timestamp,
    human: input.human ?? humanFromLegacy(legacy),
  };
  return CharacterSchema.parse(draft);
}

export function updateCharacter(
  character: Character,
  patch: CharacterPatch,
): Character {
  const updated = {
    ...character,
    ...patch,
    id: character.id, // id is immutable
    createdAt: character.createdAt, // createdAt is immutable
    updatedAt: nowIso(),
  };
  return CharacterSchema.parse(updated);
}

export function isValidCharacter(data: unknown): data is Character {
  return CharacterSchema.safeParse(data).success;
}

export function parseCharacter(data: unknown): Character {
  const result = CharacterSchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Invalid character data: ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}