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

export type LabView = "body" | "side" | "portrait" | "hands";

export function LabCamera({ view, height }: { view: LabView; height: number }) {
  const camera = useThree((state) => state.camera);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

  useEffect(() => {
    // Eyes sit at about 93 % of body height; in the A-pose the left hand hangs at about
    // (33 %, 60 %) of body height.
    const target = view === "hands" ? [height * 0.33, height * 0.6, 0] : [0, height * (view === "portrait" ? 0.93 : 0.55), 0];
    const distance = { body: 3.6, side: 3.6, portrait: 0.9, hands: 0.65 }[view];
    const y = target[1] + (view === "portrait" ? 0.02 : view === "hands" ? 0 : 0.15);
    // Side view looks at the body's left side (+X).
    if (view === "side") camera.position.set(distance, y, 0);
    else camera.position.set(target[0], y, distance);
    controls.current?.target.set(target[0], target[1], target[2]);
    controls.current?.update();
  }, [camera, view, height]);

  return <OrbitControls ref={controls} makeDefault />;
}
