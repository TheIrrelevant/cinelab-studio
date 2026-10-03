/**
 * @file StudioHeader.tsx
 * @description Studio title, character library link, optional app panel toggle and asset count.
 * @scope cinelab-studio
 * @depends next/link
 */

"use client";

import Link from "next/link";

const CHIP = "pointer-events-auto inline-flex rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-white/60 backdrop-blur-xl hover:text-white";

export function StudioHeader({
  panelLabel,
  panelOpen,
  loading,
  onTogglePanel,
  lightCount,
  cameraCount,
  modelName,
}: {
  panelLabel?: string;
  panelOpen: boolean;
  loading: boolean;
  onTogglePanel: () => void;
  lightCount: number;
  cameraCount: number;
  modelName?: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-5 sm:p-7">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">Cinelab</p>
        <h1 className="mt-1 text-lg font-medium tracking-tight">Studio 01</h1>
        <div className="mt-2 flex gap-1.5">
          <Link href="/characters" className={CHIP}>
            Characters
          </Link>
          {panelLabel ? (
            <button
              type="button"
              aria-pressed={panelOpen}
              disabled={loading}
              onClick={onTogglePanel}
              className={`${CHIP} disabled:opacity-40`}
            >
              {panelLabel}
            </button>
          ) : null}
        </div>
      </div>
      <div aria-label="Scene asset count" className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-white/55 backdrop-blur-xl">
        {lightCount} {lightCount === 1 ? "light" : "lights"} · {cameraCount}{" "}
        {cameraCount === 1 ? "camera" : "cameras"}
        {modelName ? ` · ${modelName}` : null}
      </div>
    </div>
  );
}
