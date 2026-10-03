/**
 * @file page.tsx (characters/[id]/edit)
 * @description Edit-character route. Hydrates the store, waits for ready, then shows
 *   the editor prefilled from the saved character. Renders a not-found state if the
 *   id does not match a persisted character.
 * @scope cinelab-studio
 * @depends StoreHydration, CharacterEditor, character-store
 */

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { StoreHydration } from "@cinelab/character/components/StoreHydration";
import { CharacterEditor } from "@cinelab/character/components/CharacterEditor";
import { useCharacterStore } from "@cinelab/character/character-store";

export default function EditCharacterPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const status = useCharacterStore((s) => s.status);
  const existing = useCharacterStore((s) =>
    s.characters.find((c) => c.id === id) ?? null,
  );

  return (
    <>
      <StoreHydration />
      {status !== "ready" ? (
        <div className="flex flex-1 items-center justify-center text-neutral-500">
          Loading…
        </div>
      ) : existing ? (
        <CharacterEditor mode="edit" characterId={id} />
      ) : (
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="text-xl font-semibold">Character not found</h1>
          <p className="mt-2 text-sm text-neutral-400">
            This character may have been deleted.
          </p>
          <Link
            href="/characters"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-neutral-700 px-6 font-medium hover:bg-neutral-900"
          >
            Back to library
          </Link>
        </div>
      )}
    </>
  );
}