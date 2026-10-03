/**
 * @file LightHead.tsx
 * @description Studio light head with optional softbox and the capture-aware spotlight.
 * @scope cinelab-studio
 * @depends three, light-rendering, scene-storage
 */

"use client";

import { useMemo } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, type Object3D } from "three";
import { CAPTURE_INTENSITY_KEY, lightRenderParams } from "../../light-rendering";
import type { StudioLight } from "../../scene-storage";

export function SoftboxModifier({
  color,
  width,
  height,
}: {
  color: string;
  width: number;
  height: number;
}) {
  const widthMeters = width / 100;
  const heightMeters = height / 100;
  const depth = Math.max(0.35, Math.min(0.9, Math.max(widthMeters, heightMeters) * 0.65));
  const shell = useMemo(() => {
    const backWidth = 0.22;
    const backHeight = 0.16;
    const frontWidth = widthMeters;
    const frontHeight = heightMeters;
    const backZ = 0.4;
    const frontZ = backZ + depth;
    const positions = [
      -backWidth, -backHeight, backZ,
      backWidth, -backHeight, backZ,
      backWidth, backHeight, backZ,
      -backWidth, backHeight, backZ,
      -frontWidth / 2, -frontHeight / 2, frontZ,
      frontWidth / 2, -frontHeight / 2, frontZ,
      frontWidth / 2, frontHeight / 2, frontZ,
      -frontWidth / 2, frontHeight / 2, frontZ,
    ];
    const indices = [
      0, 1, 5, 0, 5, 4,
      1, 2, 6, 1, 6, 5,
      2, 3, 7, 2, 7, 6,
      3, 0, 4, 3, 4, 7,
    ];
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }, [depth, heightMeters, widthMeters]);

  const frontZ = 0.4 + depth;

  return (
    <group>
      <mesh geometry={shell} castShadow>
        <meshStandardMaterial color="#111214" roughness={0.72} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0, frontZ + 0.005]}>
        <planeGeometry args={[widthMeters * 0.96, heightMeters * 0.94]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.35}
          roughness={0.92}
        />
      </mesh>
      <mesh position={[0, 0, frontZ + 0.015]}>
        <planeGeometry args={[widthMeters, heightMeters]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.08} wireframe />
      </mesh>
    </group>
  );
}

export function ProfessionalLightHead({
  light,
  selected,
  lightTarget,
}: {
  light: StudioLight;
  selected: boolean;
  lightTarget: Object3D;
}) {
  const hasSoftbox = light.modifier === "softbox";
  const softboxDepth = Math.max(
    0.35,
    Math.min(0.9, Math.max(light.softboxWidth, light.softboxHeight) * 0.0065),
  );
  const softboxFrontZ = 0.4 + softboxDepth;
  const params = lightRenderParams(light);

  return (
    <>
      <mesh position={[0, 0, -0.16]} castShadow>
        <boxGeometry args={[0.5, 0.36, 0.62]} />
        <meshStandardMaterial
          color={selected ? "#302719" : "#151618"}
          metalness={0.58}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0, -0.53]} castShadow>
        <boxGeometry args={[0.32, 0.24, 0.12]} />
        <meshStandardMaterial color="#242629" metalness={0.72} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 0.34, 32, 1, true]} />
        <meshStandardMaterial
          color="#777a7d"
          metalness={0.92}
          roughness={0.16}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.43]}>
        <circleGeometry args={[0.17, 32]} />
        <meshStandardMaterial
          color={params.color}
          emissive={params.color}
          emissiveIntensity={params.emissiveIntensity}
        />
      </mesh>
      <mesh position={[0, 0, 0.44]}>
        <torusGeometry args={[0.27, 0.025, 12, 36]} />
        <meshStandardMaterial color="#303235" metalness={0.9} roughness={0.18} />
      </mesh>
      {hasSoftbox ? (
        <SoftboxModifier
          color={params.color}
          width={light.softboxWidth}
          height={light.softboxHeight}
        />
      ) : null}
      <spotLight
        position={[0, 0, hasSoftbox ? softboxFrontZ + 0.02 : 0.46]}
        target={lightTarget}
        angle={params.angle}
        penumbra={params.penumbra}
        intensity={params.intensity}
        userData={{ [CAPTURE_INTENSITY_KEY]: params.captureIntensity }}
        distance={24}
        color={params.color}
        castShadow
      />
      <primitive object={lightTarget} position={[0, 0, 6]} />
    </>
  );
}
