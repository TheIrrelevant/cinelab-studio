/**
 * @file StudioCharacter.tsx
 * @description Places the active character's mannequin in the studio with floor-constrained move and Y rotation.
 * @scope cinelab-studio
 * @depends @react-three/drei, @cinelab/human/components/Mannequin, @cinelab/character/mannequin
 */

"use client";

import { Html, TransformControls } from "@react-three/drei";
import { useState } from "react";
import type { Group } from "three";
import type { Character } from "@cinelab/character/schema";
import { mannequinSpec } from "@cinelab/character/mannequin";
import { Mannequin } from "@cinelab/human/components/Mannequin";
import type { StudioModel } from "../../scene-storage";
import type { TransformMode } from "../studio-constants";

export function StudioCharacter({
  character,
  model,
  selected,
  transformMode,
  onSelect,
  onTransforming,
  onMoveEnd,
  onRotateEnd,
}: {
  character: Character;
  model: StudioModel;
  selected: boolean;
  transformMode: TransformMode;
  onSelect: () => void;
  onTransforming: (active: boolean) => void;
  onMoveEnd: (position: [number, number, number]) => void;
  onRotateEnd: (rotation: [number, number, number]) => void;
}) {
  const [object, setObject] = useState<Group | null>(null);
  const spec = mannequinSpec(character);

  return (
    <>
      <group
        ref={setObject}
        position={model.position}
        rotation={model.rotation}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <Mannequin spec={spec} pose={model.pose} selected={selected} />
        {selected ? (
          <Html position={[0, spec.height + 0.3, 0]} center zIndexRange={[20, 0]}>
            <span className="whitespace-nowrap rounded-full border border-white/20 bg-[#171819]/95 px-3 py-1 text-xs text-white shadow-xl">
              {character.name}
            </span>
          </Html>
        ) : null}
      </group>
      {selected && object ? (
        <TransformControls
          object={object}
          mode={transformMode}
          space="world"
          size={0.85}
          // The figure stands on the floor and only turns around its vertical axis.
          showY={transformMode === "rotate"}
          showX={transformMode === "translate"}
          showZ={transformMode === "translate"}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={() => onTransforming(true)}
          onMouseUp={() => {
            onTransforming(false);
            if (transformMode === "translate") {
              onMoveEnd([object.position.x, 0, object.position.z]);
            } else {
              onRotateEnd([0, object.rotation.y, 0]);
            }
          }}
        />
      ) : null}
    </>
  );
}
