/**
 * @file Cyclorama.tsx
 * @description Seamless cyclorama backdrop mesh with click selection and settings hotspot.
 * @scope cinelab-studio
 * @depends @react-three/drei, three, scene-storage, studio-constants
 */

"use client";

import { Html } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute, MeshStandardMaterial } from "three";
import { BACKDROP_COLORS, type StudioBackdrop } from "../../scene-storage";
import { CLICK_TOLERANCE } from "../studio-constants";

export function Cyclorama({
  backdrop,
  selected,
  onSelect,
  onOpenSettings,
}: {
  backdrop: StudioBackdrop;
  selected: boolean;
  onSelect: () => void;
  onOpenSettings: () => void;
}) {
  const geometry = useMemo(() => {
    const halfWidth = 30;
    const profile: Array<[number, number]> = [
      [8, 0],
      [-5.5, 0],
    ];

    for (let step = 1; step <= 12; step += 1) {
      const angle = (step / 12) * (Math.PI / 2);
      profile.push([
        -5.5 - Math.sin(angle) * 2,
        2 - Math.cos(angle) * 2,
      ]);
    }
    profile.push([-7.5, 10]);

    const positions: number[] = [];
    const indices: number[] = [];
    profile.forEach(([z, y]) => {
      positions.push(-halfWidth, y, z, halfWidth, y, z);
    });
    for (let index = 0; index < profile.length - 1; index += 1) {
      const left = index * 2;
      indices.push(left, left + 1, left + 2, left + 1, left + 3, left + 2);
    }

    const result = new BufferGeometry();
    result.setAttribute("position", new Float32BufferAttribute(positions, 3));
    result.setIndex(indices);
    result.computeVertexNormals();
    return result;
  }, []);
  const material = useMemo(
    () => new MeshStandardMaterial({ color: BACKDROP_COLORS.gray, roughness: 0.86 }),
    [],
  );
  useEffect(() => {
    material.color.set(BACKDROP_COLORS[backdrop.color]);
  }, [backdrop.color, material]);

  return (
    <>
      <mesh
        geometry={geometry}
        material={material}
        receiveShadow
        onClick={(event) => {
          if (event.delta > CLICK_TOLERANCE) return;
          // Clicks on lights, cameras or the model also reach the backdrop behind them;
          // only react when the backdrop is the nearest thing under the pointer.
          if (event.intersections[0]?.eventObject !== event.eventObject) return;
          event.stopPropagation();
          onSelect();
        }}
      />
      {selected ? (
        <Html position={[0, 2.8, -7.3]} center zIndexRange={[20, 0]}>
          <button
            type="button"
            aria-label="Open backdrop settings"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onOpenSettings();
            }}
            className="flex h-10 items-center gap-2 rounded-full border border-white/25 bg-[#171819]/95 px-3 text-xs text-white shadow-xl shadow-black/35 backdrop-blur-xl transition hover:border-amber-300/70 hover:text-amber-200"
          >
            <span aria-hidden="true" className="h-3 w-3 rounded-full border border-white/40" style={{ backgroundColor: BACKDROP_COLORS[backdrop.color] }} />
            Backdrop
          </button>
        </Html>
      ) : null}
    </>
  );
}
