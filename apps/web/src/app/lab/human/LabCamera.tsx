/**
 * @file LabCamera.tsx
 * @description Camera views for the MakeHuman lab: full body or a portrait framed on the head
 *   (head height follows the measured body height). Orbit controls stay active.
 * @scope cinelab-studio/web
 * @depends @react-three/fiber, @react-three/drei
 */

"use client";

import { type ComponentRef, useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

export type LabView = "body" | "portrait";

export function LabCamera({ view, height }: { view: LabView; height: number }) {
  const camera = useThree((state) => state.camera);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

  useEffect(() => {
    // Eyes sit at about 93 % of body height.
    const target = view === "portrait" ? [0, height * 0.93, 0] : [0, height * 0.55, 0];
    const distance = view === "portrait" ? 0.9 : 3.6;
    camera.position.set(0, target[1] + (view === "portrait" ? 0.02 : 0.15), distance);
    controls.current?.target.set(target[0], target[1], target[2]);
    controls.current?.update();
  }, [camera, view, height]);

  return <OrbitControls ref={controls} makeDefault />;
}
