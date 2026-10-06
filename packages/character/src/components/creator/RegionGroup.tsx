/**
 * @file RegionGroup.tsx
 * @description One collapsible body region of the creator (plan 2.5): its sliders and a reset.
 *   Female-only controls are hidden on male bodies. Values show as -100..100 (bipolar modifiers,
 *   with their end words under the slider) or 0..100 (breast size and firmness, unipolar shapes).
 *   Used by the Body and Head tabs.
 * @scope cinelab-studio
 * @depends @cinelab/human/makehuman/body-regions
 */

"use client";

import { regionNeutral, regionValue, type BodyRegion, type RegionControl } from "@cinelab/human/makehuman/body-regions";
import type { ShapeParams } from "@cinelab/human/makehuman/shape-model";

type Props = {
  region: BodyRegion;
  shape: ShapeParams;
  onChange: (control: RegionControl, value: number) => void;
  onReset: (region: BodyRegion) => void;
};

const controlKey = (control: RegionControl) => (control.kind === "param" ? control.key : control.id);

export function RegionGroup({ region, shape, onChange, onReset }: Props) {
  const controls = region.controls.filter((control) => !control.femaleOnly || shape.gender < 0.5);
  if (!controls.length) return null;
  const changed = controls.some((control) => regionValue(shape, control) !== regionNeutral(control));

  return (
    <details className="rounded-lg border border-neutral-800 px-3 py-2" data-testid={`region-${region.id}`}>
      <summary className="flex cursor-pointer items-center justify-between text-sm text-neutral-200">
        {region.label}
        {changed ? <span className="text-xs text-neutral-500">edited</span> : null}
      </summary>
      <div className="mt-2 space-y-2">
        {controls.map((control) => {
          const value = regionValue(shape, control);
          const param = control.kind === "param";
          const fromZero = param || (control.kind === "modifier" && control.unipolar);
          const ends = control.kind === "modifier" ? control.ends : undefined;
          return (
            <label key={controlKey(control)} className="block text-xs text-neutral-400">
              <span className="flex justify-between">
                {control.label}
                <span className="tabular-nums text-neutral-200">{Math.round(value * 100)}{param ? " %" : ""}</span>
              </span>
              <input
                type="range"
                aria-label={control.label}
                min={fromZero ? 0 : -1}
                max={1}
                step={0.01}
                value={value}
                onChange={(event) => onChange(control, Number(event.target.value))}
                className="w-full"
              />
              {ends ? (
                <span className="flex justify-between text-[10px] text-neutral-600">
                  <span>{ends[0]}</span>
                  <span>{ends[1]}</span>
                </span>
              ) : null}
            </label>
          );
        })}
        <button type="button" disabled={!changed} onClick={() => onReset(region)} className="text-xs text-neutral-400 hover:text-neutral-100 disabled:opacity-40">
          Reset {region.label.toLowerCase()}
        </button>
      </div>
    </details>
  );
}
