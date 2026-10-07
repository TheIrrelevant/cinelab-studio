/**
 * @file use-creator.ts
 * @description React state for the character creator (plan 2.5). Holds the creator model, the
 *   loaded body and its measuring topology; every body action re-solves to the locked cm/kg.
 *   Region sliders update the body live and re-solve 250 ms after the last change, so dragging
 *   stays smooth. Facial actions (plan 3.1) only change the expression.
 * @scope cinelab-studio
 * @depends react, ./creator-model, @cinelab/human (anthropometry, body-regions, body-types, ethnic-presets, head-regions, load-body)
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { measureShape, measureTopology, sizeMeasurer } from "@cinelab/human/makehuman/anthropometry";
import type { BodySize } from "@cinelab/human/makehuman/body-solver";
import { resetRegion, withRegionValue, type BodyRegion, type RegionControl } from "@cinelab/human/makehuman/body-regions";
import type { BodyTypeChoice } from "@cinelab/human/makehuman/body-types";
import { applyFaceShape, type FaceShapeId } from "@cinelab/human/makehuman/head-regions";
import { applyEthnicPreset, ETHNIC_PRESETS, matchEthnicPreset, type EthnicPresetId } from "@cinelab/human/makehuman/ethnic-presets";
import type { LoadedBody } from "@cinelab/human/makehuman/load-body";
import { initialCreatorState, keepSize, type CreatorState, type Shape } from "./creator-model";

const SETTLE_MS = 250;

export function useCreator() {
  const [state, setState] = useState<CreatorState>(initialCreatorState);
  const [body, setBody] = useState<LoadedBody | null>(null);
  const topology = useMemo(() => (body ? measureTopology(body.data) : null), [body]);
  const measure = useMemo(() => (body && topology ? sizeMeasurer(body.data, topology) : null), [body, topology]);
  const measured = useMemo(() => (body && topology ? measureShape(body.data, topology, state.shape) : null), [body, topology, state.shape]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Until the user types a size, the first measured size of the body is the lock.
  const firstSize = useMemo(() => (measured ? { heightCm: measured.heightCm, massKg: measured.massKg } : null), [body, topology]); // eslint-disable-line react-hooks/exhaustive-deps
  const fallback = useRef<BodySize | null>(null);
  useEffect(() => {
    fallback.current = firstSize;
  }, [firstSize]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const solve = useCallback((s: CreatorState, shape: Shape) => keepSize(s, shape, measure, s.size ?? fallback.current), [measure]);
  const reshape = useCallback((next: (s: CreatorState) => Shape) => setState((s) => solve(s, next(s))), [solve]);

  const actions = useMemo(
    () => ({
      setGender: (gender: number) =>
        setState((s) => {
          // A preset's hairstyle follows the gender; a hairstyle the user picked stays.
          const preset = matchEthnicPreset(s.shape);
          const hair = preset ? ETHNIC_PRESETS[preset].hair : null;
          const swap = hair && s.appearance.hair === (s.shape.gender >= 0.5 ? hair.male : hair.female);
          const appearance = swap ? { ...s.appearance, hair: gender >= 0.5 ? hair.male : hair.female } : s.appearance;
          return solve({ ...s, appearance }, { ...s.shape, gender });
        }),
      applyEthnicity: (id: EthnicPresetId) =>
        setState((s) => {
          const loaded = applyEthnicPreset(s.shape, s.appearance, id);
          return solve({ ...s, appearance: loaded.appearance }, loaded.shape);
        }),
      setBodyType: (bodyType: BodyTypeChoice) => reshape((s) => ({ ...s.shape, bodyType })),
      setSize: (size: BodySize) => setState((s) => keepSize(s, s.shape, measure, size)),
      setRegion: (control: RegionControl, value: number) => {
        setState((s) => ({ ...s, shape: withRegionValue(s.shape, control, value) }));
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => reshape((s) => s.shape), SETTLE_MS);
      },
      resetRegion: (region: BodyRegion) => reshape((s) => resetRegion(s.shape, region)),
      setFaceShape: (id: FaceShapeId | null) => reshape((s) => applyFaceShape(s.shape, id)),
      /** Facial actions (plan 3.1): the expression never changes the body size, so no re-solve. */
      setFaceUnit: (id: string, value: number) =>
        setState((s) => {
          const expression = { ...s.expression, [id]: value };
          if (value <= 0) delete expression[id];
          return { ...s, expression };
        }),
      resetFaceUnits: (ids: readonly string[]) =>
        setState((s) => ({ ...s, expression: Object.fromEntries(Object.entries(s.expression).filter(([id]) => !ids.includes(id))) })),
      /** Replaces the whole state (a loaded character, plan 2.9). */
      load: (next: CreatorState) => setState(next),
    }),
    [measure, reshape, solve],
  );

  const catalogue = body?.data.modifiers?.catalogue ?? null;
  return { state: state.size ? state : { ...state, size: firstSize }, body, catalogue, measured, setBody, actions };
}
