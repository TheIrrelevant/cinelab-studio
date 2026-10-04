/**
 * @file AppearancePanel.tsx
 * @description Appearance controls for the MakeHuman lab: skin tone, eye colour, hairstyle,
 *   hair colour (presets + picker), eyebrows and eyelashes. Choices come from the loaded assets.
 * @scope cinelab-studio/web
 * @depends @cinelab/human/makehuman/appearance
 */

"use client";

import { HAIR_COLOURS, type Appearance, type AppearanceCatalog } from "@cinelab/human/makehuman/appearance";

type Props = {
  appearance: Appearance;
  catalog: AppearanceCatalog | null;
  onChange: (appearance: Appearance) => void;
};

const label = "flex flex-col gap-1 text-xs text-neutral-400";
const select = "rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100";

function Choice({ id, title, value, options, onChange }: { id: string; title: string; value: string | null; options: string[]; onChange: (value: string | null) => void }) {
  return (
    <label className={label}>
      {title}
      <select data-testid={id} className={select} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">None</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AppearancePanel({ appearance, catalog, onChange }: Props) {
  const set = (patch: Partial<Appearance>) => onChange({ ...appearance, ...patch });
  if (!catalog) return <p className="text-xs text-neutral-500">Loading appearance…</p>;
  return (
    <div className="flex flex-col gap-3">
      <label className={label}>
        <span className="flex justify-between">
          Skin tone
          <span className="tabular-nums text-neutral-200">{Math.round(appearance.skinTone * 100)}%</span>
        </span>
        <input type="range" data-testid="slider-skinTone" min={0} max={1} step={0.01} value={appearance.skinTone} onChange={(e) => set({ skinTone: Number(e.target.value) })} />
      </label>
      <label className={label}>
        Eye colour
        <select data-testid="select-eyeColour" className={select} value={appearance.eyeColour} onChange={(e) => set({ eyeColour: e.target.value })}>
          {catalog.eyeColours.map((colour) => (
            <option key={colour} value={colour}>
              {colour}
            </option>
          ))}
        </select>
      </label>
      <Choice id="select-hair" title="Hairstyle" value={appearance.hair} options={catalog.hair} onChange={(hair) => set({ hair })} />
      <div className={label}>
        Hair colour
        <div className="flex flex-wrap items-center gap-1.5">
          {HAIR_COLOURS.map((colour) => (
            <button
              key={colour.id}
              type="button"
              title={colour.label}
              data-testid={`hair-colour-${colour.id}`}
              onClick={() => set({ hairColour: colour.hex })}
              className={`h-6 w-6 rounded-full border ${appearance.hairColour === colour.hex ? "border-white" : "border-neutral-700"}`}
              style={{ background: colour.hex }}
            />
          ))}
          <input type="color" aria-label="Custom hair colour" value={appearance.hairColour} onChange={(e) => set({ hairColour: e.target.value })} className="h-6 w-8 bg-transparent" />
        </div>
      </div>
      <Choice id="select-eyebrows" title="Eyebrows" value={appearance.eyebrows} options={catalog.eyebrows} onChange={(eyebrows) => set({ eyebrows })} />
      <Choice id="select-eyelashes" title="Eyelashes" value={appearance.eyelashes} options={catalog.eyelashes} onChange={(eyelashes) => set({ eyelashes })} />
    </div>
  );
}
