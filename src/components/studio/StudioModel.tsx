/**
 * @file StudioModel.tsx
 * @description Placeholder mannequin for the active scene character and the character picker panel.
 * @scope cinelab-studio
 * @depends @react-three/drei, three, mannequin.ts, character schema
 */

"use client";

import { Html, TransformControls } from "@react-three/drei";
import Link from "next/link";
import { useState } from "react";
import type { Group } from "three";
import type { Character } from "@/lib/character/schema";
import { mannequinSpec, type MannequinSpec } from "@/lib/studio/mannequin";
import type { StudioModel } from "@/lib/studio/scene-storage";

type TransformMode = "translate" | "rotate";

function Limb({
  position,
  length,
  radius,
  color,
}: {
  position: [number, number, number];
  length: number;
  radius: number;
  color: string;
}) {
  return (
    <mesh position={position} castShadow>
      <capsuleGeometry args={[radius, Math.max(length - radius * 2, 0.01), 8, 16]} />
      <meshStandardMaterial color={color} roughness={0.62} />
    </mesh>
  );
}

function Hair({ spec, headY, headRadius }: { spec: MannequinSpec; headY: number; headRadius: number }) {
  const material = <meshStandardMaterial color={spec.hairColor} roughness={0.85} />;
  if (spec.hair === "none") return null;
  const cap = (
    <mesh position={[0, headY + headRadius * 0.12, -headRadius * 0.05]} scale={[1.06, 1.02, 1.08]} castShadow>
      <sphereGeometry args={[headRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      {material}
    </mesh>
  );
  if (spec.hair === "cap") return cap;
  if (spec.hair === "curly") {
    return (
      <mesh position={[0, headY + headRadius * 0.2, -headRadius * 0.08]} scale={[1.25, 1.15, 1.25]} castShadow>
        <sphereGeometry args={[headRadius, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        {material}
      </mesh>
    );
  }
  if (spec.hair === "bun") {
    return (
      <>
        {cap}
        <mesh position={[0, headY + headRadius * 0.55, -headRadius * 0.85]} castShadow>
          <sphereGeometry args={[headRadius * 0.45, 16, 12]} />
          {material}
        </mesh>
      </>
    );
  }
  const length = spec.hair === "long" ? headRadius * 3.4 : headRadius * 1.6;
  return (
    <>
      {cap}
      <mesh position={[0, headY - length / 2 + headRadius * 0.6, -headRadius * 0.45]} castShadow>
        <boxGeometry args={[headRadius * 2.1, length, headRadius * 0.9]} />
        {material}
      </mesh>
    </>
  );
}

/** Simple standing figure scaled from the character's body, skin and hair settings. */
function Mannequin({ spec, selected }: { spec: MannequinSpec; selected: boolean }) {
  const unit = spec.height / 1.72;
  const legLength = 0.86 * unit;
  const torsoLength = 0.56 * unit;
  const hipY = legLength;
  const shoulderY = hipY + torsoLength;
  const headRadius = 0.11 * unit;
  const headY = shoulderY + 0.07 * unit + headRadius;
  const hipHalf = 0.1 * spec.girth * unit;
  const shoulderHalf = 0.19 * spec.shoulderRatio * spec.girth * unit;
  const limb = 0.055 * spec.girth * unit;
  const armLength = 0.66 * unit;
  const clothing = selected ? "#3a3326" : "#2b2d30";

  return (
    <group>
      <Limb position={[-hipHalf, legLength / 2, 0]} length={legLength} radius={limb * 1.15} color={clothing} />
      <Limb position={[hipHalf, legLength / 2, 0]} length={legLength} radius={limb * 1.15} color={clothing} />
      <mesh position={[0, hipY + torsoLength / 2, 0]} scale={[shoulderHalf * 2, torsoLength, 0.22 * spec.girth * unit]} castShadow>
        <capsuleGeometry args={[0.5, 0.3, 8, 16]} />
        <meshStandardMaterial color={clothing} roughness={0.7} />
      </mesh>
      <Limb position={[-(shoulderHalf + limb), shoulderY - armLength / 2, 0]} length={armLength} radius={limb} color={spec.skin} />
      <Limb position={[shoulderHalf + limb, shoulderY - armLength / 2, 0]} length={armLength} radius={limb} color={spec.skin} />
      <Limb position={[0, shoulderY + 0.04 * unit, 0]} length={0.12 * unit} radius={0.045 * unit} color={spec.skin} />
      <mesh position={[0, headY, 0]} scale={[0.92, 1.08, 1]} castShadow>
        <sphereGeometry args={[headRadius, 24, 16]} />
        <meshStandardMaterial color={spec.skin} roughness={0.55} />
      </mesh>
      <Hair spec={spec} headY={headY} headRadius={headRadius} />
    </group>
  );
}

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
        <Mannequin spec={spec} selected={selected} />
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

export function ModelPickerPanel({
  characters,
  activeCharacterId,
  onPick,
  onRemove,
  onClose,
}: {
  characters: readonly Character[];
  activeCharacterId: string | null;
  onPick: (characterId: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <aside
      aria-label="Choose a character"
      className="absolute right-5 top-1/2 max-h-[calc(100dvh-2rem)] w-72 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#151617]/95 p-4 shadow-2xl shadow-black/45 backdrop-blur-2xl"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Scene model</p>
          <h2 className="mt-1 text-sm font-medium">Choose a character</h2>
        </div>
        <button type="button" aria-label="Close character picker" onClick={onClose} className="h-8 w-8 rounded-full text-white/50 hover:bg-white/10 hover:text-white">×</button>
      </div>
      {characters.length === 0 ? (
        <div className="space-y-3 text-xs text-white/55">
          <p>No characters yet.</p>
          <Link href="/characters/new" className="inline-flex rounded-xl bg-white px-3 py-2 font-medium text-neutral-950">
            Create character
          </Link>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {characters.map((character) => {
            const active = character.id === activeCharacterId;
            return (
              <li key={character.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onPick(character.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                    active ? "border-amber-300/60 bg-amber-300/10 text-white" : "border-white/10 text-white/70 hover:border-white/25"
                  }`}
                >
                  <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-full border border-white/20" style={{ backgroundColor: mannequinSpec(character).skin }} />
                  <span className="truncate font-medium">{character.name}</span>
                  {active ? <span className="ml-auto text-[10px] text-amber-200">In scene</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/10 pt-4 text-xs">
        <Link href="/characters" className="text-white/55 hover:text-white">
          Manage characters
        </Link>
        {activeCharacterId ? (
          <button type="button" onClick={onRemove} className="text-red-300 hover:text-red-200">
            Remove from scene
          </button>
        ) : null}
      </div>
    </aside>
  );
}
