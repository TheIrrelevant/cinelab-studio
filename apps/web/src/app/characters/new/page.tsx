/**
 * @file page.tsx (characters/new)
 * @description Create-character route. Hydrates the store, then renders the editor
 *   only once persisted data is loaded (avoids draft-initialization races).
 * @scope cinelab-studio
 * @depends StoreHydration, CharacterEditor, character-store
 */

"use client";

import { StoreHydration } from "@cinelab/character/components/StoreHydration";
import { CharacterEditor } from "@cinelab/character/components/CharacterEditor";
import { useCharacterStore } from "@cinelab/character/character-store";

export default function NewCharacterPage() {
  const status = useCharacterStore((s) => s.status);

  return (
    <>
      <StoreHydration />
      {status === "ready" ? (
        <CharacterEditor mode="create" />
      ) : (
        <div className="flex flex-1 items-center justify-center text-neutral-500">
          Loading…
        </div>
      )}
    </>
  );
}