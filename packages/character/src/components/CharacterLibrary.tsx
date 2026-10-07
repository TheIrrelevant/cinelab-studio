/**
 * @file CharacterLibrary.tsx
 * @description Lists saved characters and lets the user reopen one for editing (form or the 3D
 *   creator, plan 2.9) or delete it. Phase 1 ACs: view a list of saved characters; reopen a saved
 *   character and continue editing. Pure/presentational over the store — reads
 *   characters from useCharacterStore, deletes via store.remove.
 * @scope cinelab-studio
 * @depends character-store.ts, presets.ts, Studio.tsx (character query parameter)
 */

"use client";

import Link from "next/link";
import { useState } from "react";
import { useCharacterStore } from "../character-store";
import { getBaseModel, getHairStyle, getSkinTone } from "../presets";

export function CharacterLibrary() {
  const characters = useCharacterStore((s) => s.characters);
  const remove = useCharacterStore((s) => s.remove);
  const [error, setError] = useState<string | null>(null);

  function handleDelete(id: string): void {
    setError(null);
    try {
      remove(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete character");
    }
  }

  if (characters.length === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">Character library</h1>
        <p className="mt-3 text-neutral-400">No characters yet.</p>
        <Link
          href="/characters/creator"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-neutral-100 px-6 font-medium text-neutral-950 transition-colors hover:bg-white"
        >
          Create in 3D
        </Link>
        <Link href="/characters/new" className="mt-3 block text-sm text-neutral-400 hover:text-neutral-200">
          New character
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Character library</h1>
        <div className="flex gap-2">
          <Link
            href="/characters/creator"
            className="inline-flex h-10 items-center justify-center rounded-full bg-neutral-100 px-5 text-sm font-medium text-neutral-950 hover:bg-white"
          >
            Create in 3D
          </Link>
          <Link
            href="/characters/new"
            className="inline-flex h-10 items-center justify-center rounded-full border border-neutral-700 px-5 text-sm font-medium hover:bg-neutral-900"
          >
            New character
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-400">{error}</p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((c) => {
          const base = getBaseModel(c.baseModelId);
          const skin = getSkinTone(c.skinTone);
          const hair = getHairStyle(c.hairStyle);
          return (
            <li
              key={c.id}
              className="flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-12 w-12 shrink-0 rounded-full border border-neutral-700"
                  style={{ backgroundColor: skin?.hex ?? "#ccc" }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{c.name}</p>
                  <p className="text-sm text-neutral-400">
                    {base?.label ?? "Unknown"} · {c.genderPresentation}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {hair?.label ?? "—"} hair
                  </p>
                </div>
              </div>

              <Link
                href={`/?character=${encodeURIComponent(c.id)}`}
                aria-label={`Open ${c.name} in studio`}
                className="mt-4 inline-flex h-9 items-center justify-center rounded-full border border-amber-300/40 px-4 text-sm font-medium text-amber-200 hover:bg-amber-300/10"
              >
                Open in studio
              </Link>

              <div className="mt-2 flex gap-2">
                <Link
                  href={`/characters/creator?id=${encodeURIComponent(c.id)}`}
                  aria-label={`Open ${c.name} in creator`}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-full border border-neutral-600 px-4 text-sm font-medium hover:bg-neutral-800"
                >
                  Creator
                </Link>
                <Link
                  href={`/characters/${c.id}/edit`}
                  aria-label={`Edit ${c.name}`}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-neutral-100 px-4 text-sm font-medium text-neutral-950 hover:bg-white"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  aria-label={`Delete ${c.name}`}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-neutral-700 px-4 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}