/**
 * @file StudioModel.tsx
 * @description Placeholder mannequin for the active scene character and the character picker panel.
 * @scope cinelab-studio
 * @depends @react-three/drei, three, mannequin.ts, poses.ts, character schema
 */

"use client";

import { Html, TransformControls } from "@react-three/drei";
import Link from "next/link";
import { useState } from "react";
import type { Group } from "three";
import type { Character } from "@cinelab/character/schema";
import { RIGHT_PANEL_CLASS } from "./panel-styles";
import { mannequinSpec, type MannequinSpec } from "@cinelab/character/mannequin";
import { POSE_IDS, POSES, poseAngles, type PoseId } from "@cinelab/human/poses";
import type { StudioModel } from "../scene-storage";

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

const toRadians = (angles: [number, number, number]) =>
  angles.map((value) => (value * Math.PI) / 180) as [number, number, number];

/** Two-segment limb hanging along -y from its pivot, with a bend joint between the segments. */
function JointedLimb({
  pivot,
  rotation,
  bend,
  upperLength,
  lowerLength,
  radius,
  upperColor,
  lowerColor,
  end,
}: {
  pivot: [number, number, number];
  rotation: [number, number, number];
  bend: [number, number, number];
  upperLength: number;
  lowerLength: number;
  radius: number;
  upperColor: string;
  lowerColor: string;
  end: "hand" | "foot";
}) {
  return (
    <group position={pivot} rotation={toRadians(rotation)}>
      <Limb position={[0, -upperLength / 2, 0]} length={upperLength} radius={radius} color={upperColor} />
      <group position={[0, -upperLength, 0]} rotation={toRadians(bend)}>
        <Limb position={[0, -lowerLength / 2, 0]} length={lowerLength} radius={radius * 0.9} color={lowerColor} />
        {end === "hand" ? (
          <mesh position={[0, -lowerLength - radius * 0.6, 0]} castShadow>
            <sphereGeometry args={[radius * 1.1, 12, 10]} />
            <meshStandardMaterial color={lowerColor} roughness={0.55} />
          </mesh>
        ) : (
          <mesh position={[0, -lowerLength - radius * 0.2, radius * 1.4]} castShadow>
            <boxGeometry args={[radius * 1.8, radius * 1.1, radius * 4.2]} />
            <meshStandardMaterial color="#141516" roughness={0.6} />
          </mesh>
        )}
      </group>
    </group>
  );
}

/** Jointed figure scaled from the character's body, skin and hair settings, posed by preset. */
function Mannequin({ spec, pose, selected }: { spec: MannequinSpec; pose: PoseId; selected: boolean }) {
  const angles = poseAngles(pose);
  const unit = spec.height / 1.72;
  const thigh = 0.44 * unit;
  const shin = 0.4 * unit;
  const hipY = thigh + shin + 0.04 * unit;
  const torsoLength = 0.56 * unit;
  const shoulderLocalY = torsoLength - 0.04 * unit;
  const headRadius = 0.11 * unit;
  const hipHalf = 0.1 * spec.girth * unit;
  const shoulderHalf = 0.19 * spec.shoulderRatio * spec.girth * unit;
  const limb = 0.055 * spec.girth * unit;
  const clothing = selected ? "#3a3326" : "#2b2d30";

  return (
    <group>
      <JointedLimb pivot={[-hipHalf, hipY, 0]} rotation={angles.leftHip} bend={angles.leftKnee} upperLength={thigh} lowerLength={shin} radius={limb * 1.15} upperColor={clothing} lowerColor={clothing} end="foot" />
      <JointedLimb pivot={[hipHalf, hipY, 0]} rotation={angles.rightHip} bend={angles.rightKnee} upperLength={thigh} lowerLength={shin} radius={limb * 1.15} upperColor={clothing} lowerColor={clothing} end="foot" />
      <group position={[0, hipY, 0]} rotation={toRadians(angles.spine)}>
        <mesh position={[0, torsoLength / 2, 0]} scale={[shoulderHalf * 2, torsoLength, 0.22 * spec.girth * unit]} castShadow>
          <capsuleGeometry args={[0.5, 0.3, 8, 16]} />
          <meshStandardMaterial color={clothing} roughness={0.7} />
        </mesh>
        <JointedLimb pivot={[-(shoulderHalf + limb), shoulderLocalY, 0]} rotation={angles.leftShoulder} bend={angles.leftElbow} upperLength={0.31 * unit} lowerLength={0.28 * unit} radius={limb} upperColor={clothing} lowerColor={spec.skin} end="hand" />
        <JointedLimb pivot={[shoulderHalf + limb, shoulderLocalY, 0]} rotation={angles.rightShoulder} bend={angles.rightElbow} upperLength={0.31 * unit} lowerLength={0.28 * unit} radius={limb} upperColor={clothing} lowerColor={spec.skin} end="hand" />
        <group position={[0, torsoLength + 0.02 * unit, 0]} rotation={toRadians(angles.head)}>
          <Limb position={[0, 0.04 * unit, 0]} length={0.12 * unit} radius={0.045 * unit} color={spec.skin} />
          <mesh position={[0, 0.07 * unit + headRadius, 0]} scale={[0.92, 1.08, 1]} castShadow>
            <sphereGeometry args={[headRadius, 24, 16]} />
            <meshStandardMaterial color={spec.skin} roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.07 * unit + headRadius * 0.9, headRadius * 0.95]} castShadow>
            <coneGeometry args={[headRadius * 0.16, headRadius * 0.35, 8]} />
            <meshStandardMaterial color={spec.skin} roughness={0.55} />
          </mesh>
          <Hair spec={spec} headY={0.07 * unit + headRadius} headRadius={headRadius} />
        </group>
      </group>
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
      className={RIGHT_PANEL_CLASS}
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

export function PosePickerPanel({
  pose,
  characterName,
  onPick,
  onClose,
}: {
  pose: PoseId;
  characterName: string;
  onPick: (pose: PoseId) => void;
  onClose: () => void;
}) {
  return (
    <aside
      aria-label="Choose a pose"
      className={RIGHT_PANEL_CLASS}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">{characterName}</p>
          <h2 className="mt-1 text-sm font-medium">Pose</h2>
        </div>
        <button type="button" aria-label="Close pose picker" onClick={onClose} className="h-8 w-8 rounded-full text-white/50 hover:bg-white/10 hover:text-white">×</button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {POSE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={pose === id}
            onClick={() => onPick(id)}
            className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
              pose === id ? "border-amber-300/60 bg-amber-300/10 text-white" : "border-white/10 text-white/65 hover:border-white/25"
            }`}
          >
            {POSES[id].label}
          </button>
        ))}
      </div>
    </aside>
  );
}
