/**
 * @file BodyTypePanel.tsx
 * @description Lab panel for plan 2.4: the seven body types and an intensity slider. Switching type
 *   or intensity keeps the current height and weight (re-solved); a clamp is shown when the kept
 *   weight is outside the new type's range.
 * @scope cinelab-studio/web
 * @depends @cinelab/human/makehuman/anthropometry, @cinelab/human/makehuman/body-types,
 *   @cinelab/human/makehuman/load-body, @cinelab/human/makehuman/shape-model
 */

"use client";

import { useState } from "react";
import { measureShape, sizeMeasurer, type MeasureTopology } from "@cinelab/human/makehuman/anthropometry";
import { BODY_TYPE_IDS, BODY_TYPES, switchBodyType, type BodyTypeChoice } from "@cinelab/human/makehuman/body-types";
import type { LoadedBody } from "@cinelab/human/makehuman/load-body";
import type { ShapeParams } from "@cinelab/human/makehuman/shape-model";

type Shape = Required<ShapeParams>;
type Props = { body: LoadedBody | null; topology: MeasureTopology | null; params: Shape; onChange: (params: Shape) => void };

export function BodyTypePanel({ body, topology, params, onChange }: Props) {
  const [note, setNote] = useState<string | null>(null);
  const choose = (choice: BodyTypeChoice) => {
    if (!body || !topology) return;
    const { heightCm, massKg } = measureShape(body.data, topology, params);
    const result = switchBodyType(params, choice, { heightCm, massKg }, sizeMeasurer(body.data, topology));
    setNote(result.clamped.mass ? `Weight clamped to ${result.ranges.massKg.min.toFixed(1)}-${result.ranges.massKg.max.toFixed(1)} kg for this type.` : null);
    onChange({ ...params, bodyType: choice, height: result.params.height, weight: result.params.weight });
  };
  const current = params.bodyType;

  return (
    <div className="flex flex-col gap-2 text-xs" data-testid="body-type-panel">
      <div className="grid grid-cols-4 gap-1">
        {BODY_TYPE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            data-testid={`body-type-${id}`}
            disabled={!body}
            onClick={() => choose({ id, intensity: current.intensity })}
            className={`rounded px-1 py-1 ${current.id === id ? "bg-neutral-100 text-neutral-900" : "border border-neutral-700 hover:border-neutral-400"}`}
          >
            {BODY_TYPES[id].label}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1">
        <span className="flex justify-between text-neutral-400">
          Type intensity
          <span className="tabular-nums text-neutral-200">{Math.round(current.intensity * 100)}%</span>
        </span>
        <input
          type="range"
          data-testid="slider-type-intensity"
          min={0}
          max={1}
          step={0.05}
          value={current.intensity}
          disabled={!body}
          onChange={(event) => choose({ id: current.id, intensity: Number(event.target.value) })}
        />
      </label>
      {note ? <p className="text-amber-300" data-testid="body-type-note">{note}</p> : null}
    </div>
  );
}
