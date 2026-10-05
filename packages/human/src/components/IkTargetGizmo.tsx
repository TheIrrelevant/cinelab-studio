/**
 * @file IkTargetGizmo.tsx
 * @description Move gizmo (world axes) for an IK target: a small marker at the target position;
 *   dragging reports the new world position, the caller solves the limb. The marker follows the
 *   `position` prop whenever it is not being dragged.
 * @scope cinelab-studio
 * @depends react, @react-three/drei, three
 */

"use client";

import { useEffect, useMemo, useRef } from "react";
import { TransformControls } from "@react-three/drei";
import { Object3D, Vector3 } from "three";

export type IkTargetGizmoProps = {
  /** World position of the target. */
  position: readonly [number, number, number];
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onMove?: (position: Vector3) => void;
};

export function IkTargetGizmo({ position, onDragStart, onDragEnd, onMove }: IkTargetGizmoProps) {
  const target = useMemo(() => new Object3D(), []);
  const dragging = useRef(false);
  const [x, y, z] = position;
  useEffect(() => {
    if (!dragging.current) target.position.set(x, y, z);
  }, [target, x, y, z]);
  return (
    <>
      <primitive object={target} name="ik-target" />
      <TransformControls
        object={target}
        mode="translate"
        space="world"
        size={0.6}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={() => {
          dragging.current = true;
          onDragStart?.();
        }}
        onMouseUp={() => {
          dragging.current = false;
          onDragEnd?.();
        }}
        onObjectChange={() => onMove?.(target.position.clone())}
      />
    </>
  );
}
