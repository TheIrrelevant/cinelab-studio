/**
 * @file image-repository.ts
 * @description localStorage store for reference face images as data URLs. Kept
 *   separate from character records so large image blobs don't bloat the character
 *   JSON. Character records only hold image ids (faceReferenceImageIds).
 *   Known limitation: localStorage ~5MB quota; fine for Phase 1 MVP, swap to
 *   IndexedDB or backend later.
 * @scope cinelab-studio
 * @depends storage-error.ts
 */

import { StorageWriteError } from "@/lib/character/storage-error";

const STORAGE_KEY = "cinelab-studio:images:v1";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `img-${crypto.randomUUID()}`;
  }
  return `img-${Math.random().toString(36).slice(2, 12)}`;
}

function readMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (cause) {
    throw new StorageWriteError({ cause });
  }
}

export const imageRepository = {
  save(dataUrl: string): string {
    const id = generateId();
    const map = readMap();
    map[id] = dataUrl;
    writeMap(map);
    return id;
  },

  get(id: string): string | null {
    return readMap()[id] ?? null;
  },

  delete(id: string): boolean {
    return imageRepository.deleteMany([id]) === 1;
  },

  /** Deletes every listed image in one write; returns how many existed. */
  deleteMany(ids: readonly string[]): number {
    const map = readMap();
    const existing = ids.filter((id) => id in map);
    if (existing.length === 0) return 0;
    existing.forEach((id) => {
      delete map[id];
    });
    writeMap(map);
    return existing.length;
  },

  list(): string[] {
    return Object.keys(readMap());
  },

  clear(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable; nothing to clear.
    }
  },
};