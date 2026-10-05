/**
 * @file JointHandles.tsx
 * @description On-body joint handles for a MakeHuman skeleton. Each handle is portalled into its
 *   bone, so it follows every morph and pose. Handles draw on top of the body (no depth test) and
 *   only they carry pointer handlers, so they stay clickable through the mesh. Hover enlarges a
 *   handle; selected handles turn yellow. Click reports the bone (Shift = add to selection).
 * @scope cinelab-studio
 * @depends react, @react-three/fiber, three, ../makehuman/handle-spec
 */

"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { createPortal, type ThreeEvent } from "@react-three/fiber";
import type { Bone, Skeleton } from "three";
import { HANDLE_COLOURS, handleSpecs, type HandleSpec } from "../makehuman/handle-spec";

export type JointHandlesProps = {
  skeleton: Skeleton;
  /** Rig bone names in skeleton order. */
  boneNames: readonly string[];
  /** Show finger, thumb and metacarpal handles. */
  fingers?: boolean;
  selected?: readonly string[];
  onSelect?: (bone: string, additive: boolean) => void;
  onHover?: (bone: string | null) => void;
};

export function JointHandles({ skeleton, boneNames, fingers = true, selected = [], onSelect, onHover }: JointHandlesProps) {
  const specs = useMemo(() => handleSpecs(boneNames), [boneNames]);
  const [hovered, setHovered] = useState<string | null>(null);
  const hover = (bone: string | null) => {
    setHovered(bone);
    onHover?.(bone);
  };
  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  return (
    <>
      {specs.map((spec) => {
        if (spec.finger && !fingers) return null;
        const bone = skeleton.bones[boneNames.indexOf(spec.bone)];
        if (!bone) return null;
        return (
          <Fragment key={spec.bone}>
            {createPortal(
              <Handle
                spec={spec}
                hovered={hovered === spec.bone}
                selected={selected.includes(spec.bone)}
                onOver={() => hover(spec.bone)}
                onOut={() => hovered === spec.bone && hover(null)}
                onClick={(event) => onSelect?.(spec.bone, event.shiftKey)}
              />,
              bone as Bone,
            )}
          </Fragment>
        );
      })}
    </>
  );
}

type HandleProps = {
  spec: HandleSpec;
  hovered: boolean;
  selected: boolean;
  onOver: () => void;
  onOut: () => void;
  onClick: (event: MouseEvent) => void;
};

function Handle({ spec, hovered, selected, onOver, onOut, onClick }: HandleProps) {
  const color = selected ? HANDLE_COLOURS.selected : hovered ? HANDLE_COLOURS.hover : spec.color;
  const r = spec.radius;
  const stop = (handler: (event: ThreeEvent<PointerEvent | MouseEvent>) => void) => (event: ThreeEvent<PointerEvent | MouseEvent>) => {
    event.stopPropagation();
    handler(event);
  };
  return (
    <mesh
      name={`handle:${spec.bone}`}
      renderOrder={1000}
      scale={hovered ? 1.4 : 1}
      onPointerOver={stop(onOver)}
      onPointerOut={stop(onOut)}
      onClick={stop((event) => onClick(event.nativeEvent as MouseEvent))}
    >
      {spec.shape === "triangle" ? <coneGeometry args={[r * 1.8, r * 2.6, 3]} /> : <sphereGeometry args={[r, 16, 12]} />}
      <meshBasicMaterial color={color} depthTest={false} depthWrite={false} transparent opacity={hovered || selected ? 1 : 0.85} />
    </mesh>
  );
}
