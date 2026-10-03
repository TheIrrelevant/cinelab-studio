/**
 * @file OutputFields.tsx
 * @description Stand height, power and beam spread controls for a light.
 * @scope cinelab-studio
 * @depends scene-storage, studio-constants
 */

"use client";

import type { StudioLight } from "../../../scene-storage";
import { MAX_LIGHT_HEIGHT, MIN_LIGHT_HEIGHT, type LightPatch } from "../../studio-constants";

export function StandHeightField({ light, onChange }: { light: StudioLight; onChange: (patch: LightPatch) => void }) {
  return (
  <label className="block">
    <span className="mb-2 flex items-center justify-between text-xs text-white/55">
      <span>Stand height</span>
      <span className="text-[10px] text-white/30">meters</span>
    </span>
    <div className="flex items-center rounded-xl border border-white/10 bg-black/25 px-3 focus-within:border-amber-300/70">
      <input
        aria-label="Light stand height"
        type="number"
        min={MIN_LIGHT_HEIGHT}
        max={MAX_LIGHT_HEIGHT}
        step="0.05"
        value={light.height}
        onChange={(event) =>
          onChange({
            height: Math.max(
              MIN_LIGHT_HEIGHT,
              Math.min(MAX_LIGHT_HEIGHT, Number(event.target.value) || MIN_LIGHT_HEIGHT),
            ),
          })
        }
        className="h-10 w-full bg-transparent text-sm text-white outline-none"
      />
      <span className="text-xs text-white/35">m</span>
    </div>
  </label>
  );
}

export function PowerSpreadFields({ light, onChange }: { light: StudioLight; onChange: (patch: LightPatch) => void }) {
  return (
    <>
    <label className="block">
      <span className="mb-2 flex justify-between text-xs text-white/55">
        <span>Power</span>
        <span>{Math.round(light.intensity)}</span>
      </span>
      <input
        aria-label="Light power"
        type="range"
        min="10"
        max="220"
        step="1"
        value={light.intensity}
        onChange={(event) => onChange({ intensity: Number(event.target.value) })}
        className="w-full accent-amber-300"
      />
    </label>

    <label className="block">
      <span className="mb-2 flex justify-between text-xs text-white/55">
        <span>Spread</span>
        <span>{Math.round((light.spread * 180) / Math.PI)}°</span>
      </span>
      <input
        aria-label="Light spread"
        type="range"
        min="0.2"
        max="1.15"
        step="0.01"
        value={light.spread}
        onChange={(event) => onChange({ spread: Number(event.target.value) })}
        className="w-full accent-amber-300"
      />
    </label>
    </>
  );
}
