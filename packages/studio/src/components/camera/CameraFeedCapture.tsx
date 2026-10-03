/**
 * @file CameraFeedCapture.tsx
 * @description Renders the scene through the virtual studio camera into the 2D live-view canvas at about 12 fps.
 * @scope cinelab-studio
 * @depends @react-three/fiber, three, camera-feed, camera-rig
 */

"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Euler, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { CameraFeedRenderer, exposureMultiplier, verticalFieldOfView } from "../../camera-feed";
import { lensOriginOffset, shutterSeconds } from "../../camera-rig";
import type { StudioCameraAsset } from "./camera-types";

export function CameraFeedCapture({
  camera,
  canvas,
}: {
  camera: StudioCameraAsset;
  canvas: HTMLCanvasElement | null;
}) {
  const virtualCameraRef = useRef(new PerspectiveCamera(40, 16 / 9, 0.05, 100));
  const rendererRef = useRef<CameraFeedRenderer | null>(null);
  const pixels = useMemo(() => new Uint8Array(480 * 270 * 4), []);
  const elapsed = useRef(0);

  useEffect(() => {
    const renderer = new CameraFeedRenderer();
    rendererRef.current = renderer;
    return () => { rendererRef.current = null; renderer.dispose(); };
  }, []);

  useFrame(({ gl, scene }, delta) => {
    if (!canvas || !camera.previewVisible || !rendererRef.current) return;
    elapsed.current += delta;
    if (elapsed.current < 1 / 12) return;
    elapsed.current = 0;
    const virtualCamera = virtualCameraRef.current;

    const rigRotation = new Quaternion().setFromEuler(new Euler(...camera.rotation));
    const headRotation = new Quaternion().setFromEuler(
      new Euler(
        (camera.headRotation[0] * Math.PI) / 180,
        (camera.headRotation[1] * Math.PI) / 180,
        (camera.headRotation[2] * Math.PI) / 180,
      ),
    );
    const worldRotation = rigRotation.clone().multiply(headRotation);
    const forward = new Vector3(0, 0, 1).applyQuaternion(worldRotation);
    const origin = new Vector3(0, camera.height, 0)
      .applyQuaternion(rigRotation)
      .add(new Vector3(...camera.position))
      .add(forward.clone().multiplyScalar(lensOriginOffset(camera.body, camera.lens, camera.zoomMm)));
    virtualCamera.position.copy(origin);
    virtualCamera.up.copy(new Vector3(0, 1, 0).applyQuaternion(worldRotation));
    virtualCamera.lookAt(origin.clone().add(forward));
    virtualCamera.fov = verticalFieldOfView(camera.zoomMm);
    virtualCamera.updateProjectionMatrix();
    virtualCamera.updateMatrixWorld();

    rendererRef.current.render(gl, scene, virtualCamera, {
      exposure: exposureMultiplier(camera.iso, camera.aperture, shutterSeconds(camera.shutterIndex)),
      aperture: camera.aperture,
      focalLengthMm: camera.zoomMm,
      focusDistance: camera.focusDistance,
    }, pixels);

    const context = canvas.getContext("2d");
    if (!context) return;
    const image = context.createImageData(480, 270);
    const rowSize = 480 * 4;
    for (let row = 0; row < 270; row += 1) {
      const sourceStart = (269 - row) * rowSize;
      image.data.set(pixels.subarray(sourceStart, sourceStart + rowSize), row * rowSize);
    }
    context.putImageData(image, 0, 0);
  }, -1);

  return null;
}
