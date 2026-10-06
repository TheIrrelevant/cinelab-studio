/**
 * @file BodyTab.tsx
 * @description Body tab of the character creator (plan 2.5): gender toggle, ethnicity presets
 *   (D3: Asian, African, European, Latin - each loads a standard model), height and weight in cm/kg,
 *   body type cards with intensity, and the body region groups (D4).
 * @scope cinelab-studio
 * @depends ./SizeFields, ./RegionGroup, @cinelab/human (body-types, body-regions, ethnic-presets)
 */

"use client";

import type { ReactNode } from "react";
import type { BodyMeasurements } from "@cinelab/human/makehuman/anthropometry";
import type { BodySize } from "@cinelab/human/makehuman/body-solver";
import { BODY_REGIONS, type BodyRegion, type RegionControl } from "@cinelab/human/makehuman/body-regions";
import { BODY_TYPE_IDS, BODY_TYPES, type BodyTypeChoice } from "@cinelab/human/makehuman/body-types";
import { ETHNIC_PRESET_IDS, ETHNIC_PRESETS, matchEthnicPreset, type EthnicPresetId } from "@cinelab/human/makehuman/ethnic-presets";
import type { CreatorState } from "../../creator/creator-model";
import { RegionGroup } from "./RegionGroup";
import { SizeFields } from "./SizeFields";

export type BodyTabActions = {
  setGender: (gender: number) => void;
  applyEthnicity: (id: EthnicPresetId) => void;
  setSize: (size: BodySize) => void;
  setBodyType: (choice: BodyTypeChoice) => void;
  setRegion: (control: RegionControl, value: number) => void;
  resetRegion: (region: BodyRegion) => void;
};

type Props = { state: CreatorState; measured: BodyMeasurements | null; ready: boolean; actions: BodyTabActions };

const chip = (active: boolean) =>
  `rounded-lg border px-2 py-1.5 text-sm ${active ? "border-neutral-200 bg-neutral-100 text-neutral-950" : "border-neutral-700 hover:border-neutral-400"}`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      {children}
    </section>
  );
}

export function BodyTab({ state, measured, ready, actions }: Props) {
  const { shape } = state;
  const ethnicity = matchEthnicPreset(shape);
  const type = shape.bodyType;

  return (
    <div className="space-y-6">
      <Section title="Gender">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Gender">
          {([["Female", 0], ["Male", 1]] as const).map(([label, value]) => (
            <button key={label} type="button" role="radio" aria-checked={Math.round(shape.gender) === value} disabled={!ready} onClick={() => actions.setGender(value)} className={chip(Math.round(shape.gender) === value)}>
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Ethnicity">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Ethnicity">
          {ETHNIC_PRESET_IDS.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={ethnicity === id} disabled={!ready} onClick={() => actions.applyEthnicity(id)} className={chip(ethnicity === id)}>
              {ETHNIC_PRESETS[id].label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Height and weight">
        <SizeFields size={state.size} measured={measured} note={state.note} onSize={actions.setSize} />
      </Section>

      <Section title="Body type">
        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Body type">
          {BODY_TYPE_IDS.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={type.id === id} disabled={!ready} onClick={() => actions.setBodyType({ id, intensity: type.intensity })} className={`${chip(type.id === id)} text-xs`}>
              {BODY_TYPES[id].label}
            </button>
          ))}
        </div>
        <label className="block text-xs text-neutral-400">
          <span className="flex justify-between">
            Type intensity
            <span className="tabular-nums text-neutral-200">{Math.round(type.intensity * 100)} %</span>
          </span>
          <input type="range" aria-label="Type intensity" min={0} max={1} step={0.05} value={type.intensity} disabled={!ready} onChange={(e) => actions.setBodyType({ id: type.id, intensity: Number(e.target.value) })} className="w-full" />
        </label>
      </Section>

      <Section title="Body regions">
        <div className="space-y-2">
          {BODY_REGIONS.map((region) => (
            <RegionGroup key={region.id} region={region} shape={shape} onChange={actions.setRegion} onReset={actions.resetRegion} />
          ))}
        </div>
      </Section>
    </div>
  );
}
