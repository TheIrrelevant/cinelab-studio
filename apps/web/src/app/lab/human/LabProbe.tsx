/**
 * @file LabProbe.tsx
 * @description Test hook for the human lab browser check: exposes `window.__humanLab` with the
 *   screen position of a joint handle (canvas CSS pixels), the number of rendered handles and a
 *   screen point on a transform gizmo handle.
 * @scope cinelab-studio/web
 * @depends @react-three/fiber, three
 */

"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Vector3, type Mesh, type Object3D } from "three";

type Gizmo = Object3D & { isTransformControlsGizmo?: boolean; gizmo: Record<string, Object3D> };

declare global {
  interface Window {
    __humanLab?: {
      /** `offset` is a point in the handle's local space (default its centre). */
      project: (bone: string, offset?: [number, number, number]) => { x: number; y: number } | null;
      handleCount: () => number;
      /** Screen position of any named scene object (e.g. `ik-target`). */
      projectNamed: (name: string) => { x: number; y: number } | null;
      gizmoPoint: (group: "rotate" | "translate", axis: string) => { x: number; y: number } | null;
    };
  }
}

export function LabProbe() {
  const { scene, camera, size } = useThree();
  useEffect(() => {
    const toScreen = (world: Vector3) => {
      const p = world.clone().project(camera);
      return { x: ((p.x + 1) / 2) * size.width, y: ((1 - p.y) / 2) * size.height };
    };
    window.__humanLab = {
      // Screen point on a gizmo handle line, farthest from the gizmo centre (not edge-on).
      gizmoPoint: (group, axis) => {
        let gizmo: Gizmo | null = null;
        scene.traverse((node) => {
          if ((node as Gizmo).isTransformControlsGizmo) gizmo = node as Gizmo;
        });
        if (!gizmo) return null;
        scene.updateMatrixWorld(true);
        const found = gizmo as Gizmo;
        const centre = toScreen(found.getWorldPosition(new Vector3()));
        let best: { x: number; y: number } | null = null;
        let bestDistance = 0;
        for (const child of found.gizmo[group].children.filter((c) => c.name === axis) as Mesh[]) {
          const position = child.geometry?.getAttribute("position");
          for (let i = 0; position && i < position.count; i += 1) {
            const point = toScreen(new Vector3().fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld));
            const distance = Math.hypot(point.x - centre.x, point.y - centre.y);
            if (distance > bestDistance) [best, bestDistance] = [point, distance];
          }
        }
        return best;
      },
      project: (bone, offset = [0, 0, 0]) => {
        const handle = scene.getObjectByName(`handle:${bone}`);
        if (!handle) return null;
        scene.updateMatrixWorld(true);
        return toScreen(handle.localToWorld(new Vector3(...offset)));
      },
      projectNamed: (name) => {
        const node = scene.getObjectByName(name);
        if (!node) return null;
        scene.updateMatrixWorld(true);
        return toScreen(node.getWorldPosition(new Vector3()));
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
