/**
 * @file LabProbe.tsx
 * @description Test hook for the human lab browser check: exposes `window.__humanLab` with the
 *   screen position of a joint handle (canvas CSS pixels) and the number of rendered handles.
 * @scope cinelab-studio/web
 * @depends @react-three/fiber, three
 */

"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Vector3, type Object3D } from "three";

declare global {
  interface Window {
    __humanLab?: { project: (bone: string) => { x: number; y: number } | null; handleCount: () => number };
  }
}

export function LabProbe() {
  const { scene, camera, size } = useThree();
  useEffect(() => {
    window.__humanLab = {
      project: (bone) => {
        const handle = scene.getObjectByName(`handle:${bone}`);
        if (!handle) return null;
        scene.updateMatrixWorld(true);
        const p = handle.getWorldPosition(new Vector3()).project(camera);
        return { x: ((p.x + 1) / 2) * size.width, y: ((1 - p.y) / 2) * size.height };
      },
      handleCount: () => {
        let count = 0;
        scene.traverse((node: Object3D) => {
          if (node.name.startsWith("handle:")) count += 1;
        });
        return count;
      },
    };
    return () => {
      delete window.__humanLab;
    };
  }, [scene, camera, size]);
  return null;
}
