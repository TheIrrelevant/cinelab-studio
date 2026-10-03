/**
 * @file TubeBetween.tsx
 * @description Cylinder mesh spanning two points, used for light and camera tripod legs and braces.
 * @scope cinelab-studio
 * @depends react, three
 */

"use client";

import { useMemo } from "react";
import { Quaternion, Vector3 } from "three";

export function TubeBetween({
  start,
  end,
  radius,
  color = "#161719",
  metalness = 0.82,
  roughness = 0.22,
}: {
  start: [number, number, number];
  end: [number, number, number];
  radius: number;
  color?: string;
  metalness?: number;
  roughness?: number;
}) {
  const transform = useMemo(() => {
    const from = new Vector3(...start);
    const to = new Vector3(...end);
    const direction = to.clone().sub(from);
    return {
      length: direction.length(),
      midpoint: from.add(to).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction.normalize(),
      ),
    };
  }, [end, start]);

  return (
    <mesh position={transform.midpoint} quaternion={transform.quaternion} castShadow>
      <cylinderGeometry args={[radius, radius * 1.08, transform.length, 14]} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}
