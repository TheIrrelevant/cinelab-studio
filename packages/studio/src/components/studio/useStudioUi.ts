/**
 * @file useStudioUi.ts
 * @description React state for studio selection, the open side panel and the gizmo mode.
 * @scope cinelab-studio
 * @depends ui-state.ts, studio-constants
 */

"use client";

import { useState } from "react";
import type { TransformMode } from "../studio-constants";
import {
  NO_SELECTION,
  UTILITY_PANELS,
  keepPanel,
  panelBelongsTo,
  sameSelection,
  type Panel,
  type Selection,
} from "./ui-state";

export function useStudioUi() {
  const [selection, setSelection] = useState<Selection>(NO_SELECTION);
  const [panel, setPanel] = useState<Panel>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>("translate");

  /** Selects a light, camera or model; keeps utility panels and that object's own panel. */
  const selectObject = (next: Selection) => {
    if (!sameSelection(selection, next)) setTransformMode("translate");
    setSelection(next);
    setPanel((current) => keepPanel(current, UTILITY_PANELS, (open) => panelBelongsTo(open, next)));
  };

  /** Selects a newly added asset; the model picker closes, pose and scene panels stay. */
  const selectAdded = (next: Selection) => {
    setSelection(next);
    setTransformMode("translate");
    setPanel((current) => keepPanel(current, ["posePicker", "scene"]));
  };

  /** Backdrop click clears an existing selection; with nothing selected it selects the backdrop. */
  const clickBackdrop = () => {
    if (selection.kind !== "none") {
      setSelection(NO_SELECTION);
      setPanel((current) => keepPanel(current, UTILITY_PANELS));
      return;
    }
    setSelection({ kind: "backdrop" });
    setPanel((current) => keepPanel(current, ["posePicker", "scene"]));
  };

  const toggleScenePanel = () => setPanel((current) => (current?.kind === "scene" ? null : { kind: "scene" }));

  return {
    selection,
    setSelection,
    panel,
    setPanel,
    closePanel: () => setPanel(null),
    transformMode,
    setTransformMode,
    selectObject,
    selectAdded,
    clickBackdrop,
    toggleScenePanel,
  };
}

export type StudioUi = ReturnType<typeof useStudioUi>;
