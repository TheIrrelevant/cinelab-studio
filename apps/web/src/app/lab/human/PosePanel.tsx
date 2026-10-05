/**
 * @file PosePanel.tsx
 * @description Pose controls for the human lab: selected bone, numeric X/Y/Z bar (degrees in
 *   joint-limit space: swing X, twist Y, swing Z), gizmo mode (move for the root and IK targets),
 *   local/world space, FK/IK per limb, undo/redo, reset selected and reset all.
 * @scope cinelab-studio/web
 * @depends react, @cinelab/human/makehuman/pose-numeric, @cinelab/human/components/PoseGizmo,
 *   @cinelab/human/makehuman/joint-limits, @cinelab/human/makehuman/limbs, ./LabToggle
 */

"use client";

import type { Quaternion } from "three";
import type { GizmoMode, GizmoSpace } from "@cinelab/human/components/PoseGizmo";
import { clampBoneDelta } from "@cinelab/human/makehuman/joint-limits";
import { degreesToDelta, deltaToDegrees, type PoseDegrees } from "@cinelab/human/makehuman/pose-numeric";
import { LIMB_IDS, type LimbId } from "@cinelab/human/makehuman/limbs";
import { LabToggle } from "./LabToggle";

const LIMB_LABELS: Record<LimbId, string> = { "arm.L": "L arm", "arm.R": "R arm", "leg.L": "L leg", "leg.R": "R leg" };

type Props = {
  primary: string | null;
  rotation: Quaternion | null;
  mode: GizmoMode;
  space: GizmoSpace;
  /** Root or an IK effector in IK mode: offer Move. */
  canMove: boolean;
  ik: Readonly<Partial<Record<LimbId, unknown>>>;
  onIk: (limb: LimbId, on: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
  onMode: (mode: GizmoMode) => void;
  onSpace: (space: GizmoSpace) => void;
  onRotate: (delta: Quaternion) => void;
  onUndo: () => void;
  onRedo: () => void;
  onResetSelected: () => void;
  onResetAll: () => void;
};

const BUTTON = "rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700 disabled:opacity-40";

export function PosePanel(props: Props) {
  const { primary, rotation, mode, space } = props;
  const degrees = rotation ? deltaToDegrees(rotation) : null;
  const commit = (axis: keyof PoseDegrees, input: HTMLInputElement) => {
    const value = Number(input.value);
    if (!primary || !degrees || !Number.isFinite(value) || Math.abs(value - degrees[axis]) < 1e-6) return;
    const delta = degreesToDelta({ ...degrees, [axis]: value });
    // Show the clamped result even when it equals the current pose (no re-render then).
    input.value = deltaToDegrees(clampBoneDelta(primary, delta))[axis].toFixed(1);
    props.onRotate(delta);
  };
  return (
    <section className="flex flex-col gap-2" data-testid="pose-panel">
      <div className="flex flex-wrap gap-1">
        <button type="button" className={BUTTON} data-testid="pose-undo" disabled={!props.canUndo} onClick={props.onUndo}>Undo</button>
        <button type="button" className={BUTTON} data-testid="pose-redo" disabled={!props.canRedo} onClick={props.onRedo}>Redo</button>
        <button type="button" className={BUTTON} data-testid="pose-reset-selected" disabled={!primary} onClick={props.onResetSelected}>Reset selected</button>
        <button type="button" className={BUTTON} data-testid="pose-reset-all" onClick={props.onResetAll}>Reset all</button>
      </div>
      <div className="flex flex-wrap gap-1">
        <LabToggle id="gizmo-rotate" on={mode === "rotate"} onChange={() => props.onMode("rotate")} label="Rotate" />
        {props.canMove ? <LabToggle id="gizmo-move" on={mode === "translate"} onChange={() => props.onMode("translate")} label="Move" /> : null}
        <LabToggle id="gizmo-local" on={space === "local"} onChange={() => props.onSpace(space === "local" ? "world" : "local")} label={space === "local" ? "Local" : "World"} />
      </div>
      <div className="flex flex-wrap items-center gap-1 text-xs text-neutral-400">
        IK
        {LIMB_IDS.map((limb) => (
          <LabToggle key={limb} id={`ik-${limb}`} on={Boolean(props.ik[limb])} onChange={(on) => props.onIk(limb, on)} label={LIMB_LABELS[limb]} />
        ))}
      </div>
      {primary && degrees ? (
        <div className="grid grid-cols-3 gap-1" key={`${primary}:${degrees.x.toFixed(1)}:${degrees.y.toFixed(1)}:${degrees.z.toFixed(1)}`}>
          {(["x", "y", "z"] as const).map((axis) => (
            <label key={axis} className="flex items-center gap-1 text-xs text-neutral-400">
              {axis.toUpperCase()}
              <input
                type="number"
                step={1}
                data-testid={`pose-${axis}`}
                defaultValue={degrees[axis].toFixed(1)}
                onBlur={(event) => commit(axis, event.currentTarget)}
                onKeyDown={(event) => event.key === "Enter" && commit(axis, event.currentTarget)}
                className="w-full rounded bg-neutral-900 px-1 py-0.5 text-neutral-100"
              />
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-neutral-500">Select a joint handle to pose it.</p>
      )}
    </section>
  );
}
