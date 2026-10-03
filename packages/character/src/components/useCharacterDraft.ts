/**
 * @file useCharacterDraft.ts
 * @description Editor state hook: working draft, error message, reference image
 *   session tracking and the save/cancel lifecycle (commits through the store,
 *   discards unused images, navigates back to the library). Client-only.
 * @scope cinelab-studio
 * @depends react, next/navigation, store, presets, image-repository, character-draft
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCharacterStore } from "../character-store";
import { BASE_MODELS } from "../presets";
import { imageRepository } from "../image-repository";
import {
  type Draft,
  discardImages,
  draftFromCharacter,
  draftToInput,
  readFileAsDataUrl,
} from "./character-draft";

export function useCharacterDraft(mode: "create" | "edit", characterId?: string) {
  const router = useRouter();
  const store = useCharacterStore();
  const existing = useMemo(
    () => (mode === "edit" && characterId ? store.characters.find((c) => c.id === characterId) ?? null : null),
    [mode, characterId, store.characters],
  );

  const [draft, setDraft] = useState<Draft>(() => draftFromCharacter(existing));
  const [error, setError] = useState<string | null>(null);
  // Images stored during this editing session; discarded on cancel.
  const sessionImageIds = useRef<Set<string>>(new Set());
  // Set once the editor is left (save, cancel, unmount); late file reads must not store images.
  const closed = useRef(false);
  useEffect(() => {
    closed.current = false;
    return () => {
      closed.current = true;
    };
  }, []);

  function patch<K extends keyof Draft>(key: K, value: Draft[K]): void {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleBaseModel(baseModelId: string): void {
    const model = BASE_MODELS.find((m) => m.id === baseModelId);
    setDraft((d) => ({
      ...d,
      baseModelId,
      genderPresentation: model?.genderPresentation ?? d.genderPresentation,
    }));
  }

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    setError(null);
    const ids: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const dataUrl = await readFileAsDataUrl(file);
        if (closed.current) return;
        const id = imageRepository.save(dataUrl);
        sessionImageIds.current.add(id);
        ids.push(id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add reference image");
    }
    if (ids.length === 0) return;
    setDraft((d) => ({ ...d, faceReferenceImageIds: [...d.faceReferenceImageIds, ...ids] }));
  }

  // Stored images are only deleted once the removal is saved (or on cancel for
  // images added in this session), so cancelling never breaks a saved character.
  function removeReference(id: string): void {
    setDraft((d) => ({
      ...d,
      faceReferenceImageIds: d.faceReferenceImageIds.filter((x) => x !== id),
    }));
  }

  function handleSave(): void {
    setError(null);
    try {
      if (mode === "create") {
        store.createNew(draftToInput(draft));
      } else if (existing) {
        store.updateCharacter(existing.id, draftToInput(draft));
      }
      const kept = new Set(draft.faceReferenceImageIds);
      const removedSaved = (existing?.faceReferenceImageIds ?? []).filter((id) => !kept.has(id));
      const removedNew = [...sessionImageIds.current].filter((id) => !kept.has(id));
      closed.current = true;
      sessionImageIds.current.clear();
      discardImages([...removedSaved, ...removedNew]);
      router.push("/characters");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save character");
    }
  }

  function handleCancel(): void {
    closed.current = true;
    discardImages([...sessionImageIds.current]);
    sessionImageIds.current.clear();
    router.push("/characters");
  }

  return {
    existing,
    draft,
    error,
    nameValid: draft.name.trim().length > 0,
    patch,
    handleBaseModel,
    handleFiles,
    removeReference,
    handleSave,
    handleCancel,
  };
}
