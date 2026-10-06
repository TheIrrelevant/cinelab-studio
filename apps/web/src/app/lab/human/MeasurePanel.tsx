/**
 * @file MeasurePanel.tsx
 * @description Lab panel for plan 2.3: live measurements of the current body (height, mass, waist,
 *   BMI) and typed height (cm) / weight (kg) inputs that solve the height and weight parameters.
 *   Out-of-range input is clamped and the feasible range is shown.
 * @scope cinelab-studio/web
 * @depends @cinelab/human/makehuman/anthropometry, @cinelab/human/makehuman/body-solver,
 *   @cinelab/human/makehuman/load-body, @cinelab/human/makehuman/shape-model
 */

"use client";

import { useMemo, useState } from "react";
import { measureShape, measureTopology, sizeMeasurer } from "@cinelab/human/makehuman/anthropometry";
import { solveBody, type SolveResult } from "@cinelab/human/makehuman/body-solver";
import type { LoadedBody } from "@cinelab/human/makehuman/load-body";
import type { ShapeParams } from "@cinelab/human/makehuman/shape-model";

type Shape = Required<ShapeParams>;
type Props = { body: LoadedBody | null; params: Shape; onChange: (params: Shape) => void };

const range = (r: { min: number; max: number }, digits: number) => `${r.min.toFixed(digits)}-${r.max.toFixed(digits)}`;

export function MeasurePanel({ body, params, onChange }: Props) {
  const topology = useMemo(() => (body ? measureTopology(body.data, body.mesh.geometry.getIndex()!.array) : null), [body]);
  const measured = useMemo(() => (body && topology ? measureShape(body.data, topology, params) : null), [body, topology, params]);
  const [heightCm, setHeightCm] = useState("");
  const [massKg, setMassKg] = useState("");
  const [result, setResult] = useState<SolveResult | null>(null);

  const solve = () => {
    if (!body || !topology || !measured) return;
    const request = { heightCm: Number(heightCm) || measured.heightCm, massKg: Number(massKg) || measured.massKg };
    const solved = solveBody(params, request, sizeMeasurer(body.data, topology));
    setResult(solved);
    setHeightCm(solved.target.heightCm.toFixed(1));
    setMassKg(solved.target.massKg.toFixed(1));
    onChange({ ...params, height: solved.params.height, weight: solved.params.weight });
  };

  if (!measured) return <p className="text-xs text-neutral-400">Measurements: loading...</p>;
  return (
    <div className="flex flex-col gap-2 text-xs" data-testid="measure-panel">
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 tabular-nums">
        <dt className="text-neutral-400">Height</dt>
        <dd data-testid="measure-height">{measured.heightCm.toFixed(1)} cm</dd>
        <dt className="text-neutral-400">Weight</dt>
        <dd data-testid="measure-mass">{measured.massKg.toFixed(1)} kg</dd>
        <dt className="text-neutral-400">Waist</dt>
        <dd data-testid="measure-waist">{measured.waistCm.toFixed(1)} cm</dd>
        <dt className="text-neutral-400">BMI</dt>
        <dd data-testid="measure-bmi">{measured.bmi.toFixed(1)}</dd>
      </dl>
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          solve();
        }}
      >
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-neutral-400">cm</span>
          <input data-testid="input-height-cm" inputMode="decimal" value={heightCm} placeholder={measured.heightCm.toFixed(1)} onChange={(e) => setHeightCm(e.target.value)} className="w-full rounded bg-neutral-800 px-2 py-1 text-neutral-100 placeholder:text-neutral-500" />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-neutral-400">kg</span>
          <input data-testid="input-mass-kg" inputMode="decimal" value={massKg} placeholder={measured.massKg.toFixed(1)} onChange={(e) => setMassKg(e.target.value)} className="w-full rounded bg-neutral-800 px-2 py-1 text-neutral-100 placeholder:text-neutral-500" />
        </label>
        <button type="submit" data-testid="solve-size" className="rounded border border-neutral-700 px-2 py-1 hover:border-neutral-400">
          Apply
        </button>
      </form>
      {result ? (
        <p className={result.clamped.height || result.clamped.mass ? "text-amber-300" : "text-neutral-400"} data-testid="solve-range">
          {result.clamped.height || result.clamped.mass ? "Clamped to range. " : ""}
          Range: {range(result.ranges.heightCm, 0)} cm, {range(result.ranges.massKg, 1)} kg at this height.
        </p>
      ) : null}
    </div>
  );
}
