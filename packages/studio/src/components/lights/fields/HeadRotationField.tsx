/**
 * @file HeadRotationField.tsx
 * @description Per-axis head rotation sliders and degree inputs for a light.
 * @scope cinelab-studio
 * @depends scene-storage, studio-constants
 */

"use client";

import type { StudioLight } from "../../../scene-storage";
import { HEAD_ROTATION_AXES, type LightPatch } from "../../studio-constants";

export function HeadRotationField({ light, onChange }: { light: StudioLight; onChange: (patch: LightPatch) => void }) {
  const setHeadRotation = (axisIndex: number, value: number) => {
    const nextRotation: [number, number, number] = [...light.headRotation];
    nextRotation[axisIndex] = Math.max(-180, Math.min(180, value));
    onChange({ headRotation: nextRotation });
  };

  return (
  <fieldset>
    <legend className="mb-3 text-xs text-white/55">Head rotation</legend>
    <div className="space-y-3">
      {HEAD_ROTATION_AXES.map((axis, axisIndex) => (
        <label key={axis} className="grid grid-cols-[18px_1fr_58px] items-center gap-2">
          <span className="text-xs font-semibold text-white/40">{axis}</span>
          <input
            aria-label={`Head rotation ${axis}`}
            type="range"
            min="-180"
            max="180"
            step="1"
            value={light.headRotation[axisIndex]}
            onChange={(event) => setHeadRotation(axisIndex, Number(event.target.value))}
            className="w-full accent-amber-300"
          />
          <span className="flex items-center rounded-lg bg-black/25 px-2 py-1">
            <input
              aria-label={`Head rotation ${axis} degrees`}
              type="number"
              min="-180"
              max="180"
              step="1"
              value={light.headRotation[axisIndex]}
              onChange={(event) => setHeadRotation(axisIndex, Number(event.target.value))}
              className="w-8 bg-transparent text-right text-xs text-white outline-none"
            />
            <span className="text-xs text-white/35">°</span>
          </span>
        </label>
      ))}
    </div>
  </fieldset>
  );
}
