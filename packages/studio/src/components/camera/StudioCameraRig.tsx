/**
 * @file StudioCameraRig.tsx
 * @description 3D DSLR on a tripod with transform gizmo and settings hotspot.
 * @scope cinelab-studio
 * @depends @react-three/drei, three, camera-rig, camera-lenses, TubeBetween
 */

"use client";

import { Html, RoundedBox, TransformControls } from "@react-three/drei";
import { useState } from "react";
import type { Group } from "three";
import { CAMERA_LENSES } from "../../camera-lenses";
import { CAMERA_BODIES, CAMERA_RIG_SCALE } from "../../camera-rig";
import { TubeBetween } from "../scene/TubeBetween";
import type { StudioCameraAsset } from "./camera-types";

export function StudioCameraRig({
  camera,
  selected,
  transformMode,
  onSelect,
  onOpenSettings,
  onTransforming,
  onMoveEnd,
  onRotateEnd,
}: {
  camera: StudioCameraAsset;
  selected: boolean;
  transformMode: "translate" | "rotate";
  onSelect: () => void;
  onOpenSettings: () => void;
  onTransforming: (active: boolean) => void;
  onMoveEnd: (position: [number, number, number]) => void;
  onRotateEnd: (rotation: [number, number, number]) => void;
}) {
  const [rigObject, setRigObject] = useState<Group | null>(null);
  const body = CAMERA_BODIES[camera.body];
  const lens = CAMERA_LENSES[camera.lens];
  const zoomRange = lens.focalMax - lens.focalMin;
  const zoomProgress = zoomRange === 0 ? 0 : (camera.zoomMm - lens.focalMin) / zoomRange;
  const lensLength = lens.lengthMin + (lens.lengthMax - lens.lengthMin) * zoomProgress;
  const poleStart = 0.5;
  const poleEnd = Math.max(camera.height - 0.18, 0.72);
  const poleLength = poleEnd - poleStart;

  return (
    <>
      <group
        ref={setRigObject}
        position={camera.position}
        rotation={camera.rotation}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <mesh position={[0, poleStart + poleLength / 2, 0]} castShadow>
          <cylinderGeometry args={[0.018, 0.024, poleLength, 16]} />
          <meshStandardMaterial color="#141517" metalness={0.88} roughness={0.2} />
        </mesh>
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle) => {
          const foot: [number, number, number] = [
            Math.cos(angle) * 0.68,
            0.05,
            Math.sin(angle) * 0.68,
          ];
          return (
            <group key={angle}>
              <TubeBetween color="#141517" metalness={0.86} roughness={0.2} start={[0, 0.52, 0]} end={foot} radius={0.03} />
              <mesh position={foot} rotation={[0, -angle, 0]} castShadow>
                <boxGeometry args={[0.16, 0.04, 0.075]} />
                <meshStandardMaterial color="#101113" />
              </mesh>
            </group>
          );
        })}
        <group
          position={[0, camera.height, 0]}
          scale={CAMERA_RIG_SCALE}
          rotation={camera.headRotation.map((value) => (value * Math.PI) / 180) as [number, number, number]}
        >
          <mesh position={[0, -0.12, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.045, 0.12, 24]} />
            <meshStandardMaterial color="#202225" metalness={0.8} roughness={0.22} />
          </mesh>
          <RoundedBox args={body.size} radius={0.025} smoothness={4} castShadow>
            <meshStandardMaterial
              color="#41464e"
              metalness={0.12}
              roughness={0.48}
            />
          </RoundedBox>
          <RoundedBox position={[body.size[0] * 0.48, -0.015, 0.035]} args={[0.09, 0.2, 0.16]} radius={0.025} smoothness={4} castShadow>
            <meshStandardMaterial color="#25292e" roughness={0.8} />
          </RoundedBox>
          <mesh position={[0, body.size[1] * 0.62, -0.02]} castShadow>
            <cylinderGeometry args={[0.045, 0.085, 0.085, 4]} />
            <meshStandardMaterial color="#454b52" metalness={0.15} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, -body.size[2] / 2 - 0.003]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[body.size[0] * 0.58, body.size[1] * 0.48]} />
            <meshStandardMaterial color="#32617c" emissive="#32617c" emissiveIntensity={0.7} />
          </mesh>
          <mesh position={[-body.size[0] * 0.3, body.size[1] * 0.58, 0]} castShadow>
            <cylinderGeometry args={[0.027, 0.027, 0.022, 18]} />
            <meshStandardMaterial color="#777b80" metalness={0.85} roughness={0.18} />
          </mesh>
          <mesh position={[0, 0, body.size[2] / 2 + lensLength / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[lens.radius * 1.45, lens.radius * 1.55, lensLength, 32]} />
            <meshStandardMaterial color="#30363c" metalness={0.25} roughness={0.38} />
          </mesh>
          {[0.15, 0.4, 0.72, 0.96].map((fraction, index) => (
            <mesh key={fraction} position={[0, 0, body.size[2] / 2 + lensLength * fraction]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[lens.radius * 1.58, lens.radius * 1.58, index === 1 ? 0.028 : 0.007, 48]} />
              <meshStandardMaterial color={index === 3 ? "#b8a274" : "#555c65"} metalness={0.35} roughness={0.45} />
            </mesh>
          ))}
          <mesh position={[0, 0.1, -0.09]}>
            <boxGeometry args={[0.065, 0.045, 0.035]} />
            <meshStandardMaterial color="#737981" roughness={0.4} />
          </mesh>
          <mesh position={[0.12, 0.105, 0.055]}>
            <cylinderGeometry args={[0.018, 0.02, 0.018, 24]} />
            <meshStandardMaterial color="#b9bec4" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, body.size[2] / 2 + lensLength + 0.005]}>
            <circleGeometry args={[lens.radius * 1.3, 48]} />
            <meshPhysicalMaterial color="#193043" metalness={0.2} roughness={0.06} clearcoat={1} />
          </mesh>
        </group>
        {selected ? (
          <Html position={[0, camera.height + 0.62, 0]} center zIndexRange={[20, 0]}>
            <button
              type="button"
              aria-label="Open camera settings"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onOpenSettings();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-[#171819]/95 text-white shadow-xl transition hover:border-amber-300/70 hover:text-amber-200"
            >
              <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" />
              </svg>
            </button>
          </Html>
        ) : null}
      </group>
      {selected && rigObject ? (
        <TransformControls
          object={rigObject}
          mode={transformMode}
          space={transformMode === "translate" ? "world" : "local"}
          size={0.85}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={() => onTransforming(true)}
          onMouseUp={() => {
            onTransforming(false);
            if (transformMode === "translate") {
              onMoveEnd([rigObject.position.x, rigObject.position.y, rigObject.position.z]);
            } else {
              onRotateEnd([rigObject.rotation.x, rigObject.rotation.y, rigObject.rotation.z]);
            }
          }}
        />
      ) : null}
    </>
  );
}
