/**
 * @file BodySliders.tsx
 * @description Slider panel for the MakeHuman lab: macro body parameters, ethnicity mix and
 *   one-click ethnicity presets. Values are shown as the user sees them (years, percent).
 * @scope cinelab-studio/web
 * @depends @cinelab/human/makehuman/macro
 */

"use client";

import { MAX_AGE_YEARS, MIN_AGE_YEARS, type BodyParams } from "@cinelab/human/makehuman/macro";

type Key = keyof BodyParams;
type Row = { key: Key; label: string; min: number; max: number; step: number; format: (value: number) => string };

const percent = (value: number) => `${Math.round(value * 100)}%`;
const ROWS: Row[] = [
  { key: "gender", label: "Gender (female - male)", min: 0, max: 1, step: 0.01, format: percent },
  { key: "ageYears", label: "Age", min: MIN_AGE_YEARS, max: MAX_AGE_YEARS, step: 1, format: (v) => `${v} y` },
  { key: "height", label: "Height", min: 0, max: 1, step: 0.01, format: percent },
  { key: "weight", label: "Weight", min: 0, max: 1, step: 0.01, format: percent },
  { key: "muscle", label: "Muscle", min: 0, max: 1, step: 0.01, format: percent },
  { key: "proportions", label: "Proportions", min: 0, max: 1, step: 0.01, format: percent },
  { key: "african", label: "African", min: 0, max: 1, step: 0.01, format: percent },
  { key: "asian", label: "Asian", min: 0, max: 1, step: 0.01, format: percent },
  { key: "caucasian", label: "Caucasian", min: 0, max: 1, step: 0.01, format: percent },
];

const ETHNIC_PRESETS: Array<{ id: string; label: string; mix: Pick<BodyParams, "african" | "asian" | "caucasian"> }> = [
  { id: "african", label: "African", mix: { african: 1, asian: 0, caucasian: 0 } },
  { id: "asian", label: "Asian", mix: { african: 0, asian: 1, caucasian: 0 } },
  { id: "caucasian", label: "Caucasian", mix: { african: 0, asian: 0, caucasian: 1 } },
  { id: "mixed", label: "Mixed", mix: { african: 1 / 3, asian: 1 / 3, caucasian: 1 / 3 } },
];

type Props = {
  params: BodyParams;
  onChange: (params: BodyParams) => void;
  onReset: () => void;
};

export function BodySliders({ params, onChange, onReset }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {ETHNIC_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            data-testid={`preset-${preset.id}`}
            onClick={() => onChange({ ...params, ...preset.mix })}
            className="rounded border border-neutral-700 px-2 py-1 text-xs hover:border-neutral-400"
          >
            {preset.label}
          </button>
        ))}
        <button type="button" onClick={onReset} className="rounded px-2 py-1 text-xs text-neutral-400 hover:text-neutral-100">
          Reset
        </button>
      </div>
      {ROWS.map((row) => (
        <label key={row.key} className="flex flex-col gap-1 text-xs">
          <span className="flex justify-between text-neutral-400">
            {row.label}
            <span className="tabular-nums text-neutral-200">{row.format(params[row.key])}</span>
          </span>
          <input
            type="range"
            data-testid={`slider-${row.key}`}
            min={row.min}
            max={row.max}
            step={row.step}
            value={params[row.key]}
            onChange={(event) => onChange({ ...params, [row.key]: Number(event.target.value) })}
          />
        </label>
      ))}
    </div>
  );
}
