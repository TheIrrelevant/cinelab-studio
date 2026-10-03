/**
 * @file StudioNavigation.tsx
 * @description Orbit controls plus WASD movement for the studio viewport.
 * @scope cinelab-studio
 * @depends @react-three/drei, @react-three/fiber, three
 */

"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type ComponentRef } from "react";
import { MOUSE, Vector3 } from "three";

export function StudioNavigation({ enabled }: { enabled: boolean }) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const pressedKeys = useRef(new Set<string>());
  const { camera } = useThree();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
        pressedKeys.current.add(key);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.key.toLowerCase());
    };
    const clearKeys = () => pressedKeys.current.clear();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearKeys);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
    };
  }, []);

  useFrame((_, delta) => {
    if (!enabled || pressedKeys.current.size === 0) return;

    const forward = new Vector3();
    const right = new Vector3();
    const movement = new Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();
    movement.set(0, 0, 0);

    if (pressedKeys.current.has("w")) movement.add(forward);
    if (pressedKeys.current.has("s")) movement.sub(forward);
    if (pressedKeys.current.has("d")) movement.add(right);
    if (pressedKeys.current.has("a")) movement.sub(right);

    if (movement.lengthSq() === 0) return;
    movement.normalize().multiplyScalar(5.5 * delta);
    camera.position.add(movement);
    controlsRef.current?.target.add(movement);
    controlsRef.current?.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      target={[0, 2.2, -1.5]}
      minDistance={2.5}
      maxDistance={24}
      maxPolarAngle={Math.PI / 2.04}
      enablePan={false}
      mouseButtons={{
        LEFT: MOUSE.ROTATE,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      }}
    />
  );
}
