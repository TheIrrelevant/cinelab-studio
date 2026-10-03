/**
 * @file SoftboxDimensions.tsx
 * @description Width and height sliders for the softbox modifier, in centimetres.
 * @scope cinelab-studio
 * @depends scene-storage, studio-constants
 */

"use client";

import type { StudioLight } from "../../../scene-storage";
import type { LightPatch } from "../../studio-constants";

export function SoftboxDimensions({ light, onChange }: { light: StudioLight; onChange: (patch: LightPatch) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs text-white/55">Softbox dimensions</legend>
      <div className="space-y-3">
        {([
          ["Width", "softboxWidth", light.softboxWidth],
          ["Height", "softboxHeight", light.softboxHeight],
        ] as const).map(([label, property, value]) => (
          <label key={property} className="grid grid-cols-[42px_1fr_62px] items-center gap-2">
            <span className="text-[10px] font-medium text-white/40">{label}</span>
            <input
              aria-label={`Softbox ${label.toLowerCase()}`}
              type="range"
              min="20"
              max="200"
              step="1"
              value={value}
              onChange={(event) => onChange({ [property]: Number(event.target.value) })}
              className="w-full accent-amber-300"
            />
            <span className="flex items-center rounded-lg bg-black/25 px-2 py-1">
              <input
                aria-label={`Softbox ${label.toLowerCase()} centimeters`}
                type="number"
                min="20"
                max="200"
                step="1"
                value={value}
                onChange={(event) =>
                  onChange({
                    [property]: Math.max(
                      20,
                      Math.min(200, Number(event.target.value) || 20),
                    ),
                  })
                }
                className="w-8 bg-transparent text-right text-xs text-white outline-none"
              />
              <span className="text-[10px] text-white/35">cm</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
