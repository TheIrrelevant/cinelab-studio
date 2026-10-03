/**
 * @file CharacterEditor.tsx
 * @description Character editor form + preview. Handles both create and edit modes.
 *   Phase 1 ACs: create with required name, select fixed base model preset, change
 *   limited appearance without breaking the preview, save to persistent storage.
 *   Local form state is the working draft; on save it commits through the store
 *   (which persists via the repository). Client component.
 * @scope cinelab-studio
 * @depends store, schema, presets, image-repository, CharacterPreview
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCharacterStore } from "../character-store";
import {
  type Character,
  type CharacterInput,
  type CharacterPatch,
} from "../schema";
import {
  BASE_MODELS,
  BODY_PRESETS,
  GENDER_PRESENTATIONS,
  HAIR_STYLES,
  SKIN_TONES,
} from "../presets";
import { imageRepository } from "../image-repository";
import { CharacterPreview } from "./CharacterPreview";

export interface CharacterEditorProps {
  mode: "create" | "edit";
  characterId?: string;
}

type Draft = Omit<Character, "id" | "createdAt" | "updatedAt">;

function emptyDraft(): Draft {
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

export function CharacterEditor({ mode, characterId }: CharacterEditorProps) {
  const router = useRouter();
  const store = useCharacterStore();
  const existing = useMemo(
    () => (mode === "edit" && characterId ? store.characters.find((c) => c.id === characterId) ?? null : null),
    [mode, characterId, store.characters],
  );

  const [draft, setDraft] = useState<Draft>(() => {
    if (existing) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = existing;
      void _id; void _c; void _u;
      return rest;
    }
    return emptyDraft();
  });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        const input: CharacterInput = {
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
        store.createNew(input);
      } else if (existing) {
        const patchData: CharacterPatch = {
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
        store.updateCharacter(existing.id, patchData);
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

  const nameValid = draft.name.trim().length > 0;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-10 md:grid-cols-[1fr_22rem]">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">
            {mode === "create" ? "New character" : `Edit ${existing?.name ?? ""}`}
          </h1>
          <p className="text-sm text-neutral-400">
            {mode === "create"
              ? "Define a reusable character for the studio."
              : "Update a saved character."}
          </p>
        </div>

        {/* Name */}
        <Field label="Name" required>
          <input
            type="text"
            aria-label="Name"
            value={draft.name}
            onChange={(e) => patch("name", e.target.value)}
            placeholder="e.g. Aria"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-400"
          />
        </Field>

        {/* Base model preset */}
        <Field label="Base model" required>
          <div className="grid grid-cols-3 gap-2">
            {BASE_MODELS.map((m) => (
              <label
                key={m.id}
                className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-sm ${
                  draft.baseModelId === m.id
                    ? "border-neutral-200 bg-neutral-800"
                    : "border-neutral-700 hover:bg-neutral-900"
                }`}
              >
                <input
                  type="radio"
                  name="baseModel"
                  className="sr-only"
                  checked={draft.baseModelId === m.id}
                  onChange={() => handleBaseModel(m.id)}
                />
                {m.label}
                <span className="block text-xs text-neutral-500">
                  {m.genderPresentation}
                </span>
              </label>
            ))}
          </div>
        </Field>

        {/* Gender presentation */}
        <Field label="Gender presentation">
          <Segmented
            options={GENDER_PRESENTATIONS as readonly string[]}
            value={draft.genderPresentation}
            onChange={(v) => patch("genderPresentation", v as Draft["genderPresentation"])}
          />
        </Field>

        {/* Body preset */}
        <Field label="Body preset">
          <Segmented
            options={BODY_PRESETS as readonly string[]}
            value={draft.bodyPreset}
            onChange={(v) => patch("bodyPreset", v as Draft["bodyPreset"])}
          />
        </Field>

        {/* Skin tone */}
        <Field label="Skin tone">
          <div className="flex flex-wrap gap-2">
            {SKIN_TONES.map((t) => (
              <label
                key={t.id}
                title={t.label}
                className={`h-10 w-10 cursor-pointer rounded-full border-2 ${
                  draft.skinTone === t.id ? "border-white" : "border-transparent"
                }`}
                style={{ backgroundColor: t.hex }}
              >
                <input
                  type="radio"
                  name="skinTone"
                  className="sr-only"
                  checked={draft.skinTone === t.id}
                  onChange={() => patch("skinTone", t.id)}
                />
                <span className="sr-only">{t.label}</span>
              </label>
            ))}
          </div>
        </Field>

        {/* Hair style */}
        <Field label="Hair style">
          <Segmented
            options={HAIR_STYLES.map((s) => s.label)}
            value={HAIR_STYLES.find((s) => s.id === draft.hairStyle)?.label ?? ""}
            onChange={(label) => {
              const found = HAIR_STYLES.find((s) => s.label === label);
              if (found) patch("hairStyle", found.id);
            }}
          />
        </Field>

        {/* Hair color */}
        <Field label="Hair color">
          <div className="flex items-center gap-3">
            <input
              type="color"
              aria-label="Hair color"
              value={draft.hairColor}
              onChange={(e) => patch("hairColor", e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-neutral-700 bg-neutral-900"
            />
            <span className="text-sm text-neutral-400">{draft.hairColor}</span>
          </div>
        </Field>

        {/* Reference images */}
        <Field label="Reference images">
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              aria-label="Reference images"
              onChange={(e) => handleFiles(e.target.files)}
              className="block text-sm text-neutral-400 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-neutral-100"
            />
            {draft.faceReferenceImageIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {draft.faceReferenceImageIds.map((id) => {
                  const src = imageRepository.get(id);
                  return (
                    <div key={id} className="relative h-20 w-20 overflow-hidden rounded-md border border-neutral-700">
                      {src && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="reference" className="h-full w-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeReference(id)}
                        className="absolute right-0 top-0 bg-black/70 px-1 text-xs text-white"
                        aria-label="Remove reference image"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Field>

        {/* Notes */}
        <Field label="Notes">
          <textarea
            aria-label="Notes"
            value={draft.notes}
            onChange={(e) => patch("notes", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-400"
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!nameValid}
            className="inline-flex h-11 items-center justify-center rounded-full bg-neutral-100 px-6 font-medium text-neutral-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex h-11 items-center justify-center rounded-full border border-neutral-700 px-6 font-medium hover:bg-neutral-900"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="md:sticky md:top-6 md:self-start">
        <CharacterPreview
          character={{
            name: draft.name,
            baseModelId: draft.baseModelId,
            genderPresentation: draft.genderPresentation,
            skinTone: draft.skinTone,
            hairStyle: draft.hairStyle,
            hairColor: draft.hairColor,
          }}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-neutral-300">
        {label}
        {required && <span className="ml-1 text-neutral-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const label = typeof opt === "string" ? opt : opt;
        return (
          <label
            key={label}
            className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm capitalize ${
              value === label
                ? "border-neutral-200 bg-neutral-800"
                : "border-neutral-700 hover:bg-neutral-900"
            }`}
          >
            <input
              type="radio"
              className="sr-only"
              checked={value === label}
              onChange={() => onChange(label)}
            />
            {label}
          </label>
        );
      })}
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function discardImages(ids: readonly string[]): void {
  if (ids.length === 0) return;
  try {
    imageRepository.deleteMany(ids);
  } catch {
    // Cleanup failure only leaves unused images behind; the save itself succeeded.
  }
}
