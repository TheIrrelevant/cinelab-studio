/**
 * @file editor-fields.tsx
 * @description Character editor field groups: base model cards, skin tone swatches,
 *   hair color picker and the reference images input with removable thumbnails.
 * @scope cinelab-studio
 * @depends react, presets, image-repository, editor-controls
 */

"use client";

import { useRef } from "react";
import { BASE_MODELS, SKIN_TONES } from "../presets";
import { imageRepository } from "../image-repository";
import { Field } from "./editor-controls";

export function BaseModelField({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <Field label="Base model" required>
      <div className="grid grid-cols-3 gap-2">
        {BASE_MODELS.map((m) => (
          <label
            key={m.id}
            className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-sm ${
              value === m.id
                ? "border-neutral-200 bg-neutral-800"
                : "border-neutral-700 hover:bg-neutral-900"
            }`}
          >
            <input
              type="radio"
              name="baseModel"
              className="sr-only"
              checked={value === m.id}
              onChange={() => onChange(m.id)}
            />
            {m.label}
            <span className="block text-xs text-neutral-500">
              {m.genderPresentation}
            </span>
          </label>
        ))}
      </div>
    </Field>
  );
}

export function SkinToneField({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <Field label="Skin tone">
      <div className="flex flex-wrap gap-2">
        {SKIN_TONES.map((t) => (
          <label
            key={t.id}
            title={t.label}
            className={`h-10 w-10 cursor-pointer rounded-full border-2 ${
              value === t.id ? "border-white" : "border-transparent"
            }`}
            style={{ backgroundColor: t.hex }}
          >
            <input
              type="radio"
              name="skinTone"
              className="sr-only"
              checked={value === t.id}
              onChange={() => onChange(t.id)}
            />
            <span className="sr-only">{t.label}</span>
          </label>
        ))}
      </div>
    </Field>
  );
}

export function HairColorField({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <Field label="Hair color">
      <div className="flex items-center gap-3">
        <input
          type="color"
          aria-label="Hair color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-neutral-700 bg-neutral-900"
        />
        <span className="text-sm text-neutral-400">{value}</span>
      </div>
    </Field>
  );
}

export function ReferenceImagesField({
  imageIds,
  onFiles,
  onRemove,
}: {
  imageIds: readonly string[];
  onFiles: (files: FileList | null) => void;
  onRemove: (id: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <Field label="Reference images">
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          aria-label="Reference images"
          onChange={(e) => onFiles(e.target.files)}
          className="block text-sm text-neutral-400 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-neutral-100"
        />
        {imageIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imageIds.map((id) => {
              const src = imageRepository.get(id);
              return (
                <div key={id} className="relative h-20 w-20 overflow-hidden rounded-md border border-neutral-700">
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="reference" className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(id)}
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
  );
}
