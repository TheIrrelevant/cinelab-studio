/**
 * @file PoseGizmo.tsx
 * @description Transform gizmo on a MakeHuman bone: rotate (local or world axes) for any posable
 *   bone, move for the root (always world axes). Rotations are clamped to the joint limits while dragging, so the
 *   gizmo never shows a pose the limits forbid. Reports drag start/end for undo grouping.
 * @scope cinelab-studio
 * @depends react, @react-three/drei, three, ../makehuman/bone-frames, ../makehuman/joint-limits,
 *   ../makehuman/body-pose
 */

"use client";

import { TransformControls } from "@react-three/drei";
import type { Bone, Quaternion, Vector3 } from "three";
import { restPosition } from "../makehuman/body-pose";
import { bonePoseDelta, setBonePoseDelta } from "../makehuman/bone-frames";
import { clampBoneDelta } from "../makehuman/joint-limits";

export type GizmoMode = "rotate" | "translate";
export type GizmoSpace = "local" | "world";

export type PoseGizmoProps = {
  /** Rig bone name of the primary selection. */
  bone: string;
  mode: GizmoMode;
  space: GizmoSpace;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  /** Clamped pose delta of the bone while rotating. */
  onRotate?: (delta: Quaternion) => void;
  /** Root offset from its rest position while moving. */
  onMove?: (offset: Vector3) => void;
};

export function PoseGizmo({ object, bone, mode, space, onDragStart, onDragEnd, onRotate, onMove }: PoseGizmoProps & { object: Bone }) {
  const change = () => {
    if (mode === "translate") {
      onMove?.(object.position.clone().sub(restPosition(object)));
      return;
    }
    const clamped = clampBoneDelta(bone, bonePoseDelta(object));
    setBonePoseDelta(object, clamped);
    onRotate?.(clamped);
  };
  return (
    <TransformControls
      object={object}
      mode={mode}
      // Root local axes point forward/down; moving reads naturally only in world axes.
      space={mode === "translate" ? "world" : space}
      size={0.6}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={() => onDragStart?.()}
      onMouseUp={() => onDragEnd?.()}
      onObjectChange={change}
    />
  );
}
