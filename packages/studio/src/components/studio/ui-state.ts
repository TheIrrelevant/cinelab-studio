/**
 * @file ui-state.ts
 * @description Studio selection and panel model with the rules for which panels survive a change.
 *   One object is selected at a time and at most one side panel is open.
 * @scope cinelab-studio
 * @depends none
 */

export type Selection =
  | { kind: "none" }
  | { kind: "light"; id: string }
  | { kind: "camera"; id: string }
  | { kind: "model" }
  | { kind: "backdrop" };

export type PanelKind = "light" | "camera" | "backdrop" | "modelPicker" | "posePicker" | "scene";

export type Panel =
  | { kind: "light"; id: string }
  | { kind: "camera"; id: string }
  | { kind: "backdrop" | "modelPicker" | "posePicker" | "scene" }
  | null;

export const NO_SELECTION: Selection = { kind: "none" };

/** Panels that are not tied to the selected object and stay open while selecting. */
export const UTILITY_PANELS: readonly PanelKind[] = ["modelPicker", "posePicker", "scene"];

export function sameSelection(a: Selection, b: Selection): boolean {
  if (a.kind !== b.kind) return false;
  return !("id" in a) || !("id" in b) || a.id === b.id;
}

/** True when the panel edits the given selected object. */
export function panelBelongsTo(panel: NonNullable<Panel>, selection: Selection): boolean {
  return (panel.kind === "light" || panel.kind === "camera")
    && selection.kind === panel.kind
    && selection.id === panel.id;
}

/** Keeps the panel only if its kind is listed (or `also` accepts it). */
export function keepPanel(
  panel: Panel,
  kinds: readonly PanelKind[],
  also?: (panel: NonNullable<Panel>) => boolean,
): Panel {
  if (!panel) return null;
  return kinds.includes(panel.kind) || also?.(panel) ? panel : null;
}

export function selectedId(selection: Selection, kind: "light" | "camera"): string | null {
  return selection.kind === kind ? selection.id : null;
}

/** Light, camera or model: the objects Move, Rotate and Delete act on. */
export function hasTransformable(selection: Selection): boolean {
  return selection.kind === "light" || selection.kind === "camera" || selection.kind === "model";
}
