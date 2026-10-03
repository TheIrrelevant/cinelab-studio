/**
 * @file TripodLight.tsx
 * @description Tripod light stand with transform gizmo and settings hotspot.
 * @scope cinelab-studio
 * @depends @react-three/drei, three, LightHead, TubeBetween
 */

"use client";

import { Html, TransformControls } from "@react-three/drei";
import { useMemo, useState } from "react";
import { Object3D, type Group } from "three";
import type { StudioLight } from "../../scene-storage";
import type { TransformMode } from "../studio-constants";
import { ProfessionalLightHead } from "./LightHead";
import { TubeBetween } from "../scene/TubeBetween";

export function TripodLight({
  light,
  selected,
  onSelect,
  onTransforming,
  onMoveEnd,
  onRotateEnd,
  onOpenSettings,
  transformMode,
}: {
  light: StudioLight;
  selected: boolean;
  onSelect: () => void;
  onTransforming: (active: boolean) => void;
  onMoveEnd: (position: [number, number, number]) => void;
  onRotateEnd: (rotation: [number, number, number]) => void;
  onOpenSettings: () => void;
  transformMode: TransformMode;
}) {
  const [lightObject, setLightObject] = useState<Group | null>(null);
  const lightTarget = useMemo(() => new Object3D(), []);
  const poleStart = 0.58;
  const poleEnd = Math.max(light.height - 0.22, 0.88);
  const poleLength = poleEnd - poleStart;
  const poleCenter = poleStart + poleLength / 2;

  return (
    <>
      <group
        ref={setLightObject}
        position={light.position}
        rotation={light.rotation}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <mesh position={[0, poleCenter, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.075, poleLength, 18]} />
          <meshStandardMaterial color="#151618" metalness={0.88} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.105, 0.105, 0.2, 18]} />
          <meshStandardMaterial color="#242629" metalness={0.86} roughness={0.2} />
        </mesh>
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle) => {
          const foot: [number, number, number] = [
            Math.cos(angle) * 0.78,
            0.055,
            Math.sin(angle) * 0.78,
          ];
          const braceEnd: [number, number, number] = [
            Math.cos(angle) * 0.46,
            0.3,
            Math.sin(angle) * 0.46,
          ];
          return (
            <group key={angle}>
              <TubeBetween start={[0, 0.58, 0]} end={foot} radius={0.034} />
              <TubeBetween start={[0, 0.82, 0]} end={braceEnd} radius={0.017} color="#343639" />
              <mesh position={foot} rotation={[0, -angle, 0]} castShadow>
                <boxGeometry args={[0.18, 0.045, 0.08]} />
                <meshStandardMaterial color="#101113" roughness={0.5} />
              </mesh>
            </group>
          );
        })}
        <mesh position={[0, poleEnd, 0]} castShadow>
          <cylinderGeometry args={[0.085, 0.085, 0.16, 18]} />
          <meshStandardMaterial color="#292b2e" metalness={0.82} roughness={0.22} />
        </mesh>
        <group
          position={[0, light.height, 0]}
          rotation={[
            (light.headRotation[0] * Math.PI) / 180,
            (light.headRotation[1] * Math.PI) / 180,
            (light.headRotation[2] * Math.PI) / 180,
          ]}
        >
          <ProfessionalLightHead light={light} selected={selected} lightTarget={lightTarget} />
        </group>
        {selected ? (
          <Html position={[0, light.height + 0.68, 0]} center zIndexRange={[20, 0]}>
            <button
              type="button"
              aria-label="Open light settings"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onOpenSettings();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-[#171819]/95 text-white shadow-xl shadow-black/35 backdrop-blur-xl transition hover:scale-105 hover:border-amber-300/70 hover:text-amber-200"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" />
              </svg>
            </button>
          </Html>
        ) : null}
      </group>
      {selected && lightObject ? (
        <TransformControls
          object={lightObject}
          mode={transformMode}
          space={transformMode === "translate" ? "world" : "local"}
          size={0.85}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={() => onTransforming(true)}
          onMouseUp={() => {
            onTransforming(false);
            if (transformMode === "translate" && lightObject) {
              onMoveEnd([
                lightObject.position.x,
                lightObject.position.y,
                lightObject.position.z,
              ]);
            }
            if (transformMode === "rotate") {
              onRotateEnd([
                lightObject.rotation.x,
                lightObject.rotation.y,
                lightObject.rotation.z,
              ]);
            }
          }}
        />
      ) : null}
    </>
  );
}
