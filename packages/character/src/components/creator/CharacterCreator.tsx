/**
 * @file CharacterCreator.tsx
 * @description Character creator screen (plan 2.5): large 3D viewport and a side panel with tabs.
 *   The Body tab is live; the Head tab arrives with plan 2.6. State is in memory until character
 *   data v2 (plan 2.9) adds saving.
 * @scope cinelab-studio
 * @depends react, next/link, ../../creator/use-creator, ./BodyTab, ./CreatorViewport
 */

"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useCreator } from "../../creator/use-creator";
import { BodyTab } from "./BodyTab";
import { CreatorViewport } from "./CreatorViewport";

const TABS = [
  { id: "body", label: "Body", ready: true },
  { id: "head", label: "Head", ready: false },
] as const;

export function CharacterCreator() {
  const { state, body, measured, setBody, actions } = useCreator();
  const [error, setError] = useState<string | null>(null);
  const onError = useCallback((cause: Error) => setError(cause.message), []);

  return (
    <div className="flex h-screen w-full flex-col bg-neutral-950 text-neutral-100 md:flex-row">
      <div className="relative min-h-[55vh] flex-1" data-testid="creator-viewport">
        <CreatorViewport shape={state.shape} appearance={state.appearance} onBody={setBody} onError={onError} />
        {error ? <p className="absolute left-4 top-4 rounded bg-red-950 px-3 py-2 text-sm text-red-200">{error}</p> : null}
      </div>
      <aside className="flex w-full shrink-0 flex-col border-neutral-800 md:h-screen md:w-80 md:border-l">
        <header className="flex items-baseline justify-between px-4 pt-4">
          <h1 className="text-base font-semibold">Character creator</h1>
          <Link href="/characters" className="text-xs text-neutral-400 hover:text-neutral-200">
            Characters
          </Link>
        </header>
        <nav className="flex gap-1 border-b border-neutral-800 px-4 pt-3" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === "body"}
              disabled={!tab.ready}
              title={tab.ready ? undefined : "Coming soon"}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab.id === "body" ? "border-neutral-100 text-neutral-100" : "border-transparent text-neutral-500"}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="flex-1 overflow-y-auto p-4">
          <BodyTab state={state} measured={measured} ready={Boolean(body)} actions={actions} />
        </div>
      </aside>
    </div>
  );
}
