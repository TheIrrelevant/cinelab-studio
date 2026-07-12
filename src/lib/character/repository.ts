/**
 * @file repository.ts
 * @description localStorage-backed repository for Character records. Implements the
 *   repository pattern (findAll/findById/create/update/delete) behind a stable
 *   interface so the storage mechanism can be swapped (e.g. to a backend) without
 *   changing consumers. All reads re-validate through CharacterSchema — stored data
 *   is treated as untrusted external input and corrupt entries are skipped, not thrown.
 *   Every public method returns fresh copies so callers cannot mutate internal state.
 * @scope cinelab-studio
 * @depends schema.ts
 */

import type { Character } from "@/lib/character/schema";
import { isValidCharacter, parseCharacter } from "@/lib/character/schema";

export const STORAGE_KEY = "cinelab-studio:characters:v1";

/**
 * Storage adapter interface. Default implementation uses window.localStorage;
 * tests can inject a fake. SSr-safe: localStorage is only read when present.
 */
export interface CharacterStorage {
  readRaw(): string | null;
  writeRaw(value: string): void;
  clear(): void;
}

class LocalStorageAdapter implements CharacterStorage {
  readRaw(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage may be unavailable (private mode, disabled); degrade to empty.
      return null;
    }
  }

  writeRaw(value: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Quota exceeded or storage disabled — swallow at this layer; callers see
      // an empty findAll on next read. Surfacing this to the UI is a future concern.
    }
  }

  clear(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // no-op
    }
  }
}

export interface CharacterRepository {
  findAll(): readonly Character[];
  findById(id: string): Character | null;
  create(character: Character): Character;
  update(character: Character): Character;
  delete(id: string): boolean;
  clear(): void;
}

function createRepository(
  storage: CharacterStorage = new LocalStorageAdapter(),
): CharacterRepository {
  function loadValid(): Character[] {
    const raw = storage.readRaw();
    if (!raw) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Corrupt JSON — treat as empty rather than crashing the app.
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    // Re-validate every entry; drop anything that fails schema validation.
    return parsed
      .filter((entry): entry is Character => isValidCharacter(entry))
      .map((entry) => parseCharacter(entry));
  }

  function persist(characters: readonly Character[]): void {
    storage.writeRaw(JSON.stringify(characters));
  }

  return {
    findAll(): readonly Character[] {
      // Return deep copies so callers cannot mutate internal records.
      return loadValid().map((c) => parseCharacter(JSON.parse(JSON.stringify(c))));
    },

    findById(id: string): Character | null {
      const found = loadValid().find((c) => c.id === id);
      if (!found) return null;
      // Return a copy.
      return parseCharacter(JSON.parse(JSON.stringify(found)));
    },

    create(character: Character): Character {
      const current = loadValid();
      const next = [...current, parseCharacter(character)];
      persist(next);
      // Return a fresh copy of the stored record.
      return parseCharacter(JSON.parse(JSON.stringify(character)));
    },

    update(character: Character): Character {
      const validated = parseCharacter(character);
      const current = loadValid();
      const idx = current.findIndex((c) => c.id === validated.id);
      if (idx === -1) {
        throw new Error(
          `Cannot update character: no character with id "${validated.id}"`,
        );
      }
      const next = [
        ...current.slice(0, idx),
        validated,
        ...current.slice(idx + 1),
      ];
      persist(next);
      return parseCharacter(JSON.parse(JSON.stringify(validated)));
    },

    delete(id: string): boolean {
      const current = loadValid();
      const exists = current.some((c) => c.id === id);
      if (!exists) return false;
      const next = current.filter((c) => c.id !== id);
      persist(next);
      return true;
    },

    clear(): void {
      storage.clear();
    },
  };
}

export const characterRepository: CharacterRepository = createRepository();