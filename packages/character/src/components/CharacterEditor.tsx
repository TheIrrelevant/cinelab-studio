/**
 * @file CharacterEditor.tsx
 * @description Character editor form + preview. Handles both create and edit modes.
 *   Phase 1 ACs: create with required name, select fixed base model preset, change
 *   limited appearance without breaking the preview, save to persistent storage.
 *   Local form state is the working draft (useCharacterDraft); on save it commits
 *   through the store (which persists via the repository). Client component.
 * @scope cinelab-studio
 * @depends presets, useCharacterDraft, character-draft, editor-controls, editor-fields, CharacterPreview
 */

"use client";

import { BODY_PRESETS, GENDER_PRESENTATIONS, HAIR_STYLES } from "../presets";
import type { Draft } from "./character-draft";
import { useCharacterDraft } from "./useCharacterDraft";
import { Field, Segmented } from "./editor-controls";
import { BaseModelField, HairColorField, ReferenceImagesField, SkinToneField } from "./editor-fields";
import { CharacterPreview } from "./CharacterPreview";

export interface CharacterEditorProps {
  mode: "create" | "edit";
  characterId?: string;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-400";

export function CharacterEditor({ mode, characterId }: CharacterEditorProps) {
  const {
    existing, draft, error, nameValid,
    patch, handleBaseModel, handleFiles, removeReference, handleSave, handleCancel,
  } = useCharacterDraft(mode, characterId);

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

        <Field label="Name" required>
          <input
            type="text"
            aria-label="Name"
            value={draft.name}
            onChange={(e) => patch("name", e.target.value)}
            placeholder="e.g. Aria"
            className={INPUT_CLASS}
          />
        </Field>

        <BaseModelField value={draft.baseModelId} onChange={handleBaseModel} />

        <Field label="Gender presentation">
          <Segmented
            options={GENDER_PRESENTATIONS as readonly string[]}
            value={draft.genderPresentation}
            onChange={(v) => patch("genderPresentation", v as Draft["genderPresentation"])}
          />
        </Field>

        <Field label="Body preset">
          <Segmented
            options={BODY_PRESETS as readonly string[]}
            value={draft.bodyPreset}
            onChange={(v) => patch("bodyPreset", v as Draft["bodyPreset"])}
          />
        </Field>

        <SkinToneField value={draft.skinTone} onChange={(id) => patch("skinTone", id)} />

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

        <HairColorField value={draft.hairColor} onChange={(hex) => patch("hairColor", hex)} />

        <ReferenceImagesField
          imageIds={draft.faceReferenceImageIds}
          onFiles={handleFiles}
          onRemove={removeReference}
        />

        <Field label="Notes">
          <textarea
            aria-label="Notes"
            value={draft.notes}
            onChange={(e) => patch("notes", e.target.value)}
            rows={3}
            className={INPUT_CLASS}
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
