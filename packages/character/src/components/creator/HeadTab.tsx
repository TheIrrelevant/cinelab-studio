/**
 * @file HeadTab.tsx
 * @description Head tab of the character creator (plan 2.6): face-shape presets and the collapsible
 *   head groups (head shape, forehead, eyebrows, eyes, nose, cheeks, mouth, chin, ears, neck) with
 *   every head modifier; left and right move together; each group has its own reset.
 * @scope cinelab-studio
 * @depends ./RegionGroup, @cinelab/human (head-regions, body-regions, modifier-catalogue)
 */

"use client";

import { useMemo } from "react";
import type { BodyRegion, RegionControl } from "@cinelab/human/makehuman/body-regions";
import { currentFaceShape, FACE_SHAPE_IDS, headRegions, type FaceShapeId } from "@cinelab/human/makehuman/head-regions";
import type { Modifier } from "@cinelab/human/makehuman/modifier-catalogue";
import type { ShapeParams } from "@cinelab/human/makehuman/shape-model";
import { RegionGroup } from "./RegionGroup";

export type HeadTabActions = {
  setFaceShape: (id: FaceShapeId | null) => void;
  setRegion: (control: RegionControl, value: number) => void;
  resetRegion: (region: BodyRegion) => void;
};

type Props = { shape: ShapeParams; catalogue: readonly Modifier[] | null; actions: HeadTabActions };

const chip = (active: boolean) =>
  `rounded-lg border px-2 py-1.5 text-xs capitalize ${active ? "border-neutral-200 bg-neutral-100 text-neutral-950" : "border-neutral-700 hover:border-neutral-400"}`;

export function HeadTab({ shape, catalogue, actions }: Props) {
  const regions = useMemo(() => (catalogue ? headRegions(catalogue) : []), [catalogue]);
  const face = currentFaceShape(shape);
  if (!catalogue) return <p className="text-sm text-neutral-500">Loading head controls...</p>;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Face shape</h3>
        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Face shape">
          <button type="button" role="radio" aria-checked={face === null} onClick={() => actions.setFaceShape(null)} className={chip(face === null)}>
            Natural
          </button>
          {FACE_SHAPE_IDS.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={face === id} onClick={() => actions.setFaceShape(id)} className={chip(face === id)}>
              {id}
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Features</h3>
        <div className="space-y-2">
          {regions.map((region) => (
            <RegionGroup key={region.id} region={region} shape={shape} onChange={actions.setRegion} onReset={actions.resetRegion} />
          ))}
        </div>
      </section>
    </div>
  );
}
