/**
 * @file render-repository.ts
 * @description localStorage history of render requests and results, so every output
 *   stays linked to the exact scene JSON and provider parameters that produced it.
 *   Status changes must follow the lifecycle in contract.ts.
 * @scope cinelab-studio
 * @depends contract.ts, character/storage-error.ts
 */

import { StorageWriteError } from "@cinelab/core/storage-error";
import {
  canTransition,
  renderRecordSchema,
  type RenderRecord,
  type RenderRequest,
  type RenderResult,
} from "./contract";

export const RENDER_STORAGE_KEY = "cinelab-studio:renders:v1";

export interface RenderStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type RenderResultPatch = Partial<Pick<RenderResult, "status" | "provider" | "outputs" | "error" | "startedAt" | "completedAt">>;

export function createRenderRepository(storage: () => RenderStorage | null = () => (typeof window === "undefined" ? null : window.localStorage)) {
  function load(): RenderRecord[] {
    const raw = storage()?.getItem(RENDER_STORAGE_KEY);
    if (!raw) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      const result = renderRecordSchema.safeParse(entry);
      return result.success ? [result.data] : [];
    });
  }

  function persist(records: RenderRecord[]) {
    const target = storage();
    if (!target) throw new StorageWriteError();
    try {
      target.setItem(RENDER_STORAGE_KEY, JSON.stringify(records));
    } catch (cause) {
      throw new StorageWriteError({ cause });
    }
  }

  return {
    /** Newest first. */
    list(): RenderRecord[] {
      return load().sort((a, b) => b.request.createdAt.localeCompare(a.request.createdAt));
    },

    findById(requestId: string): RenderRecord | null {
      return load().find((record) => record.request.id === requestId) ?? null;
    },

    /** Records a new request in the queued state. */
    enqueue(request: RenderRequest, now: Date = new Date()): RenderRecord {
      const records = load();
      if (records.some((record) => record.request.id === request.id)) {
        throw new Error(`Render request "${request.id}" already exists`);
      }
      const record = renderRecordSchema.parse({
        request,
        result: {
          requestId: request.id,
          status: "queued",
          provider: null,
          outputs: [],
          error: null,
          queuedAt: now.toISOString(),
          startedAt: null,
          completedAt: null,
        },
      });
      persist([...records, record]);
      return record;
    },

    /** Applies a result update; rejects status changes the lifecycle does not allow. */
    update(requestId: string, patch: RenderResultPatch): RenderRecord {
      const records = load();
      const index = records.findIndex((record) => record.request.id === requestId);
      if (index === -1) throw new Error(`No render request "${requestId}"`);
      const current = records[index];
      if (patch.status && patch.status !== current.result.status && !canTransition(current.result.status, patch.status)) {
        throw new Error(`Cannot move render "${requestId}" from ${current.result.status} to ${patch.status}`);
      }
      const updated = renderRecordSchema.parse({ ...current, result: { ...current.result, ...patch } });
      persist([...records.slice(0, index), updated, ...records.slice(index + 1)]);
      return updated;
    },

    /** Requests rendered from an identical scene, for comparison and re-rendering. */
    findBySceneHash(sceneHash: string): RenderRecord[] {
      return load().filter((record) => record.request.sceneHash === sceneHash);
    },
  };
}

export const renderRepository = createRenderRepository();
