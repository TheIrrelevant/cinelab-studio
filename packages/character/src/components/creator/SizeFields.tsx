/**
 * @file SizeFields.tsx
 * @description Height (cm) and weight (kg) inputs of the creator body tab, with the measured
 *   waist and BMI and the clamp note. Enter, or leaving the form, locks the typed size.
 * @scope cinelab-studio
 * @depends react, @cinelab/human/makehuman/anthropometry, @cinelab/human/makehuman/body-solver
 */

"use client";

import { useState } from "react";
import type { BodyMeasurements } from "@cinelab/human/makehuman/anthropometry";
import type { BodySize } from "@cinelab/human/makehuman/body-solver";

type Props = { size: BodySize | null; measured: BodyMeasurements | null; note: string | null; onSize: (size: BodySize) => void };

const INPUT = "w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm tabular-nums text-neutral-100 outline-none focus:border-neutral-400";

/** Re-keyed on every new locked size, so the inputs restart from it without syncing effects. */
export function SizeFields(props: Props) {
  const { size } = props;
  return <SizeForm key={size ? `${size.heightCm}/${size.massKg}` : "none"} {...props} />;
}

function SizeForm({ size, measured, note, onSize }: Props) {
  const [cm, setCm] = useState(size ? size.heightCm.toFixed(1) : "");
  const [kg, setKg] = useState(size ? size.massKg.toFixed(1) : "");
  const commit = () => {
    const heightCm = Number.parseFloat(cm);
    const massKg = Number.parseFloat(kg);
    const edited = cm !== size?.heightCm.toFixed(1) || kg !== size?.massKg.toFixed(1);
    if (edited && Number.isFinite(heightCm) && Number.isFinite(massKg)) onSize({ heightCm, massKg });
  };

  return (
    <div className="space-y-2">
      <form
        className="grid grid-cols-2 gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          commit();
        }}
        // Moving between the two fields is not a commit; leaving the form is.
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) commit();
        }}
      >
        <label className="text-xs text-neutral-400">
          Height (cm)
          <input aria-label="Height (cm)" inputMode="decimal" value={cm} disabled={!size} onChange={(e) => setCm(e.target.value)} className={INPUT} />
        </label>
        <label className="text-xs text-neutral-400">
          Weight (kg)
          <input aria-label="Weight (kg)" inputMode="decimal" value={kg} disabled={!size} onChange={(e) => setKg(e.target.value)} className={INPUT} />
        </label>
        <button type="submit" className="sr-only">Apply size</button>
      </form>
      <p className="text-xs tabular-nums text-neutral-400" data-testid="creator-measured">
        {measured
          ? `Measured ${measured.heightCm.toFixed(1)} cm, ${measured.massKg.toFixed(1)} kg, waist ${measured.waistCm.toFixed(0)} cm, BMI ${measured.bmi.toFixed(1)}`
          : "Loading body..."}
      </p>
      {note ? <p role="status" className="text-xs text-amber-300">{note}</p> : null}
    </div>
  );
}
