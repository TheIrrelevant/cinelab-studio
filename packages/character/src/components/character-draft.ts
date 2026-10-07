/**
 * @file character-draft.ts
 * @description Pure helpers for the character editor draft: draft type, empty draft,
 *   conversion from a saved character, file reading and best-effort image discard.
 * @scope cinelab-studio
 * @depends schema, presets, image-repository
 */

import type { Character, CharacterInput } from "../schema";
import { BASE_MODELS, HAIR_STYLES, SKIN_TONES } from "../presets";
import { imageRepository } from "../image-repository";

/** The v1 editor fields; the MakeHuman `human` is edited in the creator and kept on save. */
export type Draft = Omit<Character, "id" | "createdAt" | "updatedAt" | "version" | "human">;

export function emptyDraft(): Draft {
  return {
    name: "",
    baseModelId: BASE_MODELS[0].id,
    genderPresentation: "androgynous",
    bodyPreset: "average",
    skinTone: SKIN_TONES[2].id,
    hairStyle: HAIR_STYLES[2].id,
    hairColor: "#1a1a1a",
    faceReferenceImageIds: [],
    notes: "",
  };
}

export function draftFromCharacter(existing: Character | null): Draft {
  if (existing) {
    const { id: _id, createdAt: _c, updatedAt: _u, version: _v, human: _h, ...rest } = existing;
    void _id; void _c; void _u; void _v; void _h;
    return rest;
  }
  return emptyDraft();
}

/** Fields committed on save; the name is trimmed. Used for both create and update. */
export function draftToInput(draft: Draft): CharacterInput {
  return {
    name: draft.name.trim(),
    baseModelId: draft.baseModelId,
    genderPresentation: draft.genderPresentation,
    bodyPreset: draft.bodyPreset,
    skinTone: draft.skinTone,
    hairStyle: draft.hairStyle,
    hairColor: draft.hairColor,
    faceReferenceImageIds: draft.faceReferenceImageIds,
    notes: draft.notes,
  };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export function discardImages(ids: readonly string[]): void {
  if (ids.length === 0) return;
  try {
    imageRepository.deleteMany(ids);
  } catch {
    // Cleanup failure only leaves unused images behind; the save itself succeeded.
  }
}
