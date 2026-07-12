/**
 * @file page.tsx
 * @description Cinelab Studio landing page. Entry point linking to the character editor and library.
 * @scope cinelab-studio
 * @depends characters editor (src/app/characters), character library (src/app/characters/library)
 */

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          Virtual AI Photo Studio
        </p>
        <h1 className="mb-4 text-5xl font-semibold tracking-tight">
          Cinelab Studio
        </h1>
        <p className="mb-10 text-lg leading-8 text-neutral-400">
          Create named characters, place them in a controllable 3D studio, and
          send the structured scene to an AI provider for photorealistic
          renders.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/characters/new"
            className="inline-flex h-12 items-center justify-center rounded-full bg-neutral-100 px-6 font-medium text-neutral-950 transition-colors hover:bg-white"
          >
            New character
          </Link>
          <Link
            href="/characters"
            className="inline-flex h-12 items-center justify-center rounded-full border border-neutral-700 px-6 font-medium transition-colors hover:bg-neutral-900"
          >
            Character library
          </Link>
        </div>
      </div>
    </main>
  );
}