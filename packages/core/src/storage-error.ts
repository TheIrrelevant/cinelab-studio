/**
 * @file storage-error.ts
 * @description Error raised when a character or image write cannot be persisted
 *   (quota exceeded, storage disabled). Callers surface it instead of losing data silently.
 * @scope cinelab-studio
 * @depends none
 */

export class StorageWriteError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Storage is full or unavailable. Changes were not saved.", options);
    this.name = "StorageWriteError";
  }
}
