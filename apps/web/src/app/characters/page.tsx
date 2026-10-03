/**
 * @file page.tsx (characters)
 * @description Character library route. Hydrates the store, waits for ready, then
 *   renders the library list. Satisfies Phase 1 AC: view a list of saved characters.
 * @scope cinelab-studio
 * @depends StoreHydration, CharacterLibrary, character-store
 */

"use client";

import Link from "next/link";
import { StoreHydration } from "@cinelab/character/components/StoreHydration";
import { CharacterLibrary } from "@cinelab/character/components/CharacterLibrary";
import { useCharacterStore } from "@cinelab/character/character-store";

export default function CharactersPage() {
  const status = useCharacterStore((s) => s.status);

  return (
    <>
      <StoreHydration />
      {status === "ready" ? (
        <CharacterLibrary />
      ) : (
        <div className="flex flex-1 items-center justify-center text-neutral-500">
          Loading…
        </div>
      )}
      <div className="mx-auto w-full max-w-5xl px-6 pb-10">
        <Link
          href="/"
          className="text-sm text-neutral-400 hover:text-neutral-200"
        >
          ← Back to studio
        </Link>
      </div>
    </>
  );
}