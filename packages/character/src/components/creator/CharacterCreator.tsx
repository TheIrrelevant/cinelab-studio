/**
 * @file CharacterCreator.tsx
 * @description Character creator screen (plan 2.5): large 3D viewport and a side panel with tabs.
 *   Body tab (plan 2.5) and Head tab (plan 2.6, camera frames the head). Name and Save store the
 *   character as data v2 (plan 2.9); `characterId` opens a saved character (deep link).
 * @scope cinelab-studio
 * @depends react, next/link, ../../creator/use-creator, ../../creator/use-creator-persistence, ./BodyTab, ./HeadTab, ./CreatorViewport
 */

"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useCreator } from "../../creator/use-creator";
import { useCreatorPersistence } from "../../creator/use-creator-persistence";
import { BodyTab } from "./BodyTab";
import { HeadTab } from "./HeadTab";
import { CreatorViewport } from "./CreatorViewport";

const TABS = [
  { id: "body", label: "Body" },
  { id: "head", label: "Head" },
] as const;
type TabId = (typeof TABS)[number]["id"];

type Props = {
  /** Saved character to open, or null for a new one. */
  characterId?: string | null;
  /** Called with the id after a save (the route puts it into the URL). */
  onSaved?: (id: string) => void;
};

export function CharacterCreator({ characterId = null, onSaved }: Props) {
  const { state, body, catalogue, measured, setBody, actions } = useCreator();
  const saving = useCreatorPersistence(characterId, state, actions.load);
  const [tab, setTab] = useState<TabId>("body");
  const [error, setError] = useState<string | null>(null);
  const onError = useCallback((cause: Error) => setError(cause.message), []);

  return (
    <div className="flex h-screen w-full flex-col bg-neutral-950 text-neutral-100 md:flex-row">
      <div className="relative min-h-[55vh] flex-1" data-testid="creator-viewport">
        <CreatorViewport shape={state.shape} appearance={state.appearance} focus={tab} onBody={setBody} onError={onError} />
        {error ? <p className="absolute left-4 top-4 rounded bg-red-950 px-3 py-2 text-sm text-red-200">{error}</p> : null}
      </div>
      <aside className="flex w-full shrink-0 flex-col border-neutral-800 md:h-screen md:w-80 md:border-l">
        <header className="flex items-baseline justify-between px-4 pt-4">
          <h1 className="text-base font-semibold">Character creator</h1>
          <Link href="/characters" className="text-xs text-neutral-400 hover:text-neutral-200">
            Characters
          </Link>
        </header>
        <div className="flex items-center gap-2 px-4 pt-3">
          <input
            aria-label="Character name"
            placeholder="Name"
            value={saving.name}
            onChange={(event) => saving.rename(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            disabled={!saving.ready}
            onClick={() => {
              const id = saving.save();
              if (id) onSaved?.(id);
            }}
            className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-950 disabled:opacity-50"
          >
            Save
          </button>
        </div>
        <p className="h-4 px-4 pt-1 text-xs text-neutral-500" role="status">
          {saving.missing ? "Character not found - saving creates a new one." : saving.status === "saved" ? "Saved." : saving.status === "error" ? `Not saved: ${saving.error}` : ""}
        </p>
        <nav className="flex gap-1 border-b border-neutral-800 px-4 pt-3" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === item.id ? "border-neutral-100 text-neutral-100" : "border-transparent text-neutral-500 hover:text-neutral-300"}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "body" ? (
            <BodyTab state={state} measured={measured} ready={Boolean(body)} actions={actions} />
          ) : (
            <HeadTab shape={state.shape} catalogue={catalogue} actions={actions} />
          )}
        </div>
      </aside>
    </div>
  );
}
