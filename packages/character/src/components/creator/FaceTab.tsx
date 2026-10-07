/**
 * @file FaceTab.tsx
 * @description Face tab of the character creator (plan 3.1): the 51 facial actions in collapsible
 *   groups (brows, eyes, cheeks and nose, jaw, mouth) as 0-100 % sliders, a reset per group and one
 *   for the whole face. Eye look sliders also turn the eyes.
 * @scope cinelab-studio
 * @depends @cinelab/human/makehuman/face-units
 */

"use client";

import { FACE_GROUPS, FACE_UNIT_IDS, type FaceExpression } from "@cinelab/human/makehuman/face-units";

export type FaceTabActions = {
  setFaceUnit: (id: string, value: number) => void;
  resetFaceUnits: (ids: readonly string[]) => void;
};

type Props = { expression: FaceExpression; ready: boolean; actions: FaceTabActions };

export function FaceTab({ expression, ready, actions }: Props) {
  const active = Object.keys(expression).length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Facial actions</h3>
        <button type="button" disabled={!active} onClick={() => actions.resetFaceUnits(FACE_UNIT_IDS)} className="text-xs text-neutral-400 hover:text-neutral-100 disabled:opacity-40">
          Reset face
        </button>
      </div>
      {FACE_GROUPS.map((group) => {
        const ids = group.units.map((unit) => unit.id);
        const changed = ids.some((id) => (expression[id] ?? 0) > 0);
        return (
          <details key={group.id} className="rounded-lg border border-neutral-800 px-3 py-2" data-testid={`face-${group.id}`}>
            <summary className="flex cursor-pointer items-center justify-between text-sm text-neutral-200">
              {group.label}
              {changed ? <span className="text-xs text-neutral-500">edited</span> : null}
            </summary>
            <div className="mt-2 space-y-2">
              {group.units.map((unit) => {
                const value = expression[unit.id] ?? 0;
                return (
                  <label key={unit.id} className="block text-xs text-neutral-400">
                    <span className="flex justify-between">
                      {unit.label}
                      <span className="tabular-nums text-neutral-200">{Math.round(value * 100)} %</span>
                    </span>
                    <input
                      type="range"
                      aria-label={`${group.label}: ${unit.label}`}
                      min={0}
                      max={1}
                      step={0.01}
                      value={value}
                      disabled={!ready}
                      onChange={(event) => actions.setFaceUnit(unit.id, Number(event.target.value))}
                      className="w-full"
                    />
                  </label>
                );
              })}
              <button type="button" disabled={!changed} onClick={() => actions.resetFaceUnits(ids)} className="text-xs text-neutral-400 hover:text-neutral-100 disabled:opacity-40">
                Reset {group.label.toLowerCase()}
              </button>
            </div>
          </details>
        );
      })}
    </div>
  );
}
