/**
 * @file CreatorViewport.tsx
 * @description 3D viewport of the character creator: the MakeHuman body for the current shape and
 *   appearance on a floor disc, studio lights and orbit controls; `focus` frames the full body or a
 *   three-quarter portrait of the head (Head tab).
 * @scope cinelab-studio
 * @depends @react-three/fiber, @react-three/drei, @cinelab/human/components/MakeHumanBody
 */

"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { MakeHumanBody } from "@cinelab/human/components/MakeHumanBody";
import type { Appearance } from "@cinelab/human/makehuman/appearance";
import type { LoadedBody } from "@cinelab/human/makehuman/load-body";
import type { ShapeParams } from "@cinelab/human/makehuman/shape-model";

export type ViewFocus = "body" | "head";
type Props = { shape: ShapeParams; appearance: Appearance; focus?: ViewFocus; onBody: (body: LoadedBody) => void; onError: (error: Error) => void };

/** Camera and orbit target per focus: full body, or a three-quarter portrait of the head. */
const VIEWS: Record<ViewFocus, { position: [number, number, number]; target: [number, number, number] }> = {
  body: { position: [0, 1.1, 3.4], target: [0, 0.95, 0] },
  head: { position: [0.32, 1.55, 0.62], target: [0, 1.52, 0] },
};

function CameraRig({ focus }: { focus: ViewFocus }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as { target: { set: (x: number, y: number, z: number) => void }; update: () => void } | null;
  useEffect(() => {
    const view = VIEWS[focus];
    camera.position.set(...view.position);
    controls?.target.set(...view.target);
    controls?.update();
  }, [camera, controls, focus]);
  return null;
}

export function CreatorViewport({ shape, appearance, focus = "body", onBody, onError }: Props) {
  return (
    <Canvas shadows camera={{ position: [0, 1.1, 3.4], fov: 35 }} gl={{ preserveDrawingBuffer: true }}>
      <color attach="background" args={["#1f1f23"]} />
      <hemisphereLight args={["#ffffff", "#444444", 0.8]} />
      <directionalLight position={[2.5, 4, 3]} intensity={2.2} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.6, 48]} />
        <meshStandardMaterial color="#2c2c31" />
      </mesh>
      <MakeHumanBody params={shape} appearance={appearance} onBody={onBody} onError={onError} />
      <OrbitControls target={VIEWS.body.target} minDistance={0.3} maxDistance={6} enablePan={false} makeDefault />
      <CameraRig focus={focus} />
    </Canvas>
  );
}
