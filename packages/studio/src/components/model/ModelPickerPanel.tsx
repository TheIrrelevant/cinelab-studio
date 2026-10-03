/**
 * @file ModelPickerPanel.tsx
 * @description Side panel to choose which saved character stands in the studio.
 * @scope cinelab-studio
 * @depends next/link, @cinelab/character/mannequin, panel-styles
 */

"use client";

import Link from "next/link";
import type { Character } from "@cinelab/character/schema";
import { mannequinSpec } from "@cinelab/character/mannequin";
import { RIGHT_PANEL_CLASS } from "../panel-styles";

export function ModelPickerPanel({
  characters,
  activeCharacterId,
  onPick,
  onRemove,
  onClose,
}: {
  characters: readonly Character[];
  activeCharacterId: string | null;
  onPick: (characterId: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <aside
      aria-label="Choose a character"
      className={RIGHT_PANEL_CLASS}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Scene model</p>
          <h2 className="mt-1 text-sm font-medium">Choose a character</h2>
        </div>
        <button type="button" aria-label="Close character picker" onClick={onClose} className="h-8 w-8 rounded-full text-white/50 hover:bg-white/10 hover:text-white">×</button>
      </div>
      {characters.length === 0 ? (
        <div className="space-y-3 text-xs text-white/55">
          <p>No characters yet.</p>
          <Link href="/characters/new" className="inline-flex rounded-xl bg-white px-3 py-2 font-medium text-neutral-950">
            Create character
          </Link>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {characters.map((character) => {
            const active = character.id === activeCharacterId;
            return (
              <li key={character.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onPick(character.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                    active ? "border-amber-300/60 bg-amber-300/10 text-white" : "border-white/10 text-white/70 hover:border-white/25"
                  }`}
                >
                  <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-full border border-white/20" style={{ backgroundColor: mannequinSpec(character).skin }} />
                  <span className="truncate font-medium">{character.name}</span>
                  {active ? <span className="ml-auto text-[10px] text-amber-200">In scene</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/10 pt-4 text-xs">
        <Link href="/characters" className="text-white/55 hover:text-white">
          Manage characters
        </Link>
        {activeCharacterId ? (
          <button type="button" onClick={onRemove} className="text-red-300 hover:text-red-200">
            Remove from scene
          </button>
        ) : null}
      </div>
    </aside>
  );
}
