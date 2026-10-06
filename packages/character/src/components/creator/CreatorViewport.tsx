/**
 * @file CreatorViewport.tsx
 * @description 3D viewport of the character creator: the MakeHuman body for the current shape and
 *   appearance on a floor disc, studio lights and orbit controls around the body.
 * @scope cinelab-studio
 * @depends @react-three/fiber, @react-three/drei, @cinelab/human/components/MakeHumanBody
 */

"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { MakeHumanBody } from "@cinelab/human/components/MakeHumanBody";
import type { Appearance } from "@cinelab/human/makehuman/appearance";
import type { LoadedBody } from "@cinelab/human/makehuman/load-body";
import type { ShapeParams } from "@cinelab/human/makehuman/shape-model";

type Props = { shape: ShapeParams; appearance: Appearance; onBody: (body: LoadedBody) => void; onError: (error: Error) => void };

export function CreatorViewport({ shape, appearance, onBody, onError }: Props) {
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
      <OrbitControls target={[0, 0.95, 0]} minDistance={0.8} maxDistance={6} enablePan={false} makeDefault />
    </Canvas>
  );
}
