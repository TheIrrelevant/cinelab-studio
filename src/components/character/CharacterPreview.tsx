/**
 * @file CharacterPreview.tsx
 * @description Lightweight 2D preview that reflects appearance choices (skin tone
 *   swatch, hair color, base model label, gender presentation). Phase 1 has no 3D
 *   viewport (that arrives in Phase 3); this panel proves the preview updates with
 *   settings without breaking. Pure/presentational.
 * @scope cinelab-studio
 * @depends presets.ts, schema.ts
 */

import { getBaseModel, getHairStyle, getSkinTone } from "@/lib/character/presets";
import type { Character } from "@/lib/character/schema";

export interface CharacterPreviewProps {
  character: Pick<
    Character,
    "name" | "baseModelId" | "genderPresentation" | "skinTone" | "hairStyle" | "hairColor"
  >;
}

export function CharacterPreview({ character }: CharacterPreviewProps) {
  const base = getBaseModel(character.baseModelId);
  const skin = getSkinTone(character.skinTone);
  const hair = getHairStyle(character.hairStyle);

  return (
    <div
      data-testid="character-preview"
      className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
    >
      <div className="relative flex h-48 w-40 items-end justify-center">
        {/* Hair (top) */}
        <div
          className="absolute left-1/2 top-2 h-16 w-28 -translate-x-1/2 rounded-t-full"
          style={{ backgroundColor: character.hairColor }}
          aria-label="hair color preview"
        />
        {/* Head */}
        <div
          className="absolute left-1/2 top-6 h-24 w-24 -translate-x-1/2 rounded-full border-2 border-neutral-700"
          style={{ backgroundColor: skin?.hex ?? "#ccc" }}
          aria-label="skin tone preview"
        />
        {/* Shoulders */}
        <div className="h-20 w-36 rounded-t-2xl bg-neutral-700" />
      </div>

      <div className="mt-6 text-center">
        <p className="text-lg font-semibold">{character.name || "Untitled"}</p>
        <p className="text-sm text-neutral-400">
          {base?.label ?? "Unknown"} · {character.genderPresentation}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          {hair?.label ?? "Unknown hair"} · {skin?.label ?? "Unknown skin"}
        </p>
      </div>
    </div>
  );
}