/**
 * @file character-store.ts
 * @description Zustand store wiring the character domain to the persistence
 *   repository. The characters array is the single source of truth; the active
 *   character is derived from activeCharacterId + the array. All mutations go
 *   through the repository (persistence) and return immutable new state slices.
 *   Exposes a factory for test isolation and a singleton for app use.
 * @scope cinelab-studio
 * @depends repository.ts, image-repository.ts, schema.ts
 */

import { create } from "zustand";
import type { CharacterRepository } from "./repository";
import { characterRepository } from "./repository";
import { imageRepository } from "./image-repository";
import {
  createCharacter,
  updateCharacter,
  type Character,
  type CharacterInput,
  type CharacterPatch,
} from "./schema";

export type CharacterStoreStatus = "idle" | "loading" | "ready" | "error";

export interface CharacterState {
  readonly characters: readonly Character[];
  readonly activeCharacterId: string | null;
  readonly status: CharacterStoreStatus;
  readonly error: string | null;
  // actions
  load: () => void;
  createNew: (input: CharacterInput) => Character;
  setActive: (id: string | null) => void;
  getActive: () => Character | null;
  updateActive: (patch: CharacterPatch) => Character | null;
  updateCharacter: (id: string, patch: CharacterPatch) => Character | null;
  remove: (id: string) => void;
  reset: () => void;
}

type ImageCleanup = Pick<typeof imageRepository, "deleteMany">;

export function createCharacterStore(
  repo: CharacterRepository = characterRepository,
  images: ImageCleanup = imageRepository,
) {
  return create<CharacterState>()((set, get) => ({
    characters: [],
    activeCharacterId: null,
    status: "idle",
    error: null,

    load: () => {
      set({ status: "loading", error: null });
      try {
        const characters = repo.findAll();
        set({
          characters,
          status: "ready",
          // active id may now point to a deleted character; drop if missing.
          activeCharacterId: get().activeCharacterId &&
            characters.some((c) => c.id === get().activeCharacterId)
            ? get().activeCharacterId
            : null,
        });
      } catch (e) {
        set({
          status: "error",
          error: e instanceof Error ? e.message : "Failed to load characters",
        });
      }
    },

    createNew: (input) => {
      const draft = createCharacter(input);
      const saved = repo.create(draft);
      set((state) => ({
        characters: [...state.characters, saved],
        activeCharacterId: saved.id,
      }));
      return saved;
    },

    setActive: (id) => {
      if (id === null) {
        set({ activeCharacterId: null });
        return;
      }
      // Only allow setting active to a character that exists in the list.
      const exists = get().characters.some((c) => c.id === id);
      if (!exists) return;
      set({ activeCharacterId: id });
    },

    getActive: () => {
      const { characters, activeCharacterId } = get();
      if (!activeCharacterId) return null;
      return characters.find((c) => c.id === activeCharacterId) ?? null;
    },

    updateActive: (patch) => {
      const { activeCharacterId, characters } = get();
      if (!activeCharacterId) return null;
      const current = characters.find((c) => c.id === activeCharacterId);
      if (!current) return null;
      const updated = updateCharacter(current, patch);
      repo.update(updated);
      set((state) => ({
        characters: state.characters.map((c) =>
          c.id === updated.id ? updated : c,
        ),
      }));
      return updated;
    },

    updateCharacter: (id, patch) => {
      const current = get().characters.find((c) => c.id === id);
      if (!current) return null;
      const updated = updateCharacter(current, patch);
      repo.update(updated);
      set((state) => ({
        characters: state.characters.map((c) =>
          c.id === updated.id ? updated : c,
        ),
      }));
      return updated;
    },

    remove: (id) => {
      const imageIds = get().characters.find((c) => c.id === id)?.faceReferenceImageIds ?? [];
      repo.delete(id);
      set((state) => ({
        characters: state.characters.filter((c) => c.id !== id),
        activeCharacterId:
          state.activeCharacterId === id ? null : state.activeCharacterId,
      }));
      try {
        images.deleteMany(imageIds);
      } catch {
        // The character is already gone; leftover images only cost space.
      }
    },

    reset: () => {
      set({ characters: [], activeCharacterId: null, status: "idle", error: null });
    },
  }));
}

export const useCharacterStore = createCharacterStore();