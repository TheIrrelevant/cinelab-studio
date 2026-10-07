/**
 * @file CreatorViewport.tsx
 * @description 3D viewport of the character creator: the MakeHuman body for the current shape and
 *   appearance on a floor disc, studio lights and orbit controls; `focus` frames the full body or a
 *   three-quarter portrait of the head (Head tab); a procedural room environment adds soft
 *   reflections (plan 2.7).
 * @scope cinelab-studio
 * @depends three (RoomEnvironment), @react-three/fiber, @react-three/drei, @cinelab/human/components/MakeHumanBody
 */

"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PMREMGenerator } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { OrbitControls } from "@react-three/drei";
import { MakeHumanBody } from "@cinelab/human/components/MakeHumanBody";
import type { Appearance } from "@cinelab/human/makehuman/appearance";
import type { LoadedBody } from "@cinelab/human/makehuman/load-body";
import type { ShapeParams } from "@cinelab/human/makehuman/shape-model";
import type { FaceExpression } from "@cinelab/human/makehuman/face-units";

export type ViewFocus = "body" | "head" | "face";
type Props = { shape: ShapeParams; appearance: Appearance; expression?: FaceExpression; focus?: ViewFocus; onBody: (body: LoadedBody) => void; onError: (error: Error) => void };

/** Camera and orbit target per focus: full body, a three-quarter head portrait, or the face from the front. */
const VIEWS: Record<ViewFocus, { position: [number, number, number]; target: [number, number, number] }> = {
  body: { position: [0, 1.1, 3.4], target: [0, 0.95, 0] },
  head: { position: [0.32, 1.55, 0.62], target: [0, 1.52, 0] },
  face: { position: [0.08, 1.51, 0.66], target: [0, 1.49, 0] },
};

/** Soft image-based light from three's procedural room (no external files), plan 2.7. */
function RoomLight() {
  const gl = useThree((state) => state.gl);
  const target = useMemo(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const result = pmrem.fromScene(room, 0.04);
    room.dispose();
    pmrem.dispose();
    return result;
  }, [gl]);
  useEffect(() => () => target.dispose(), [target]);
  return <primitive object={target.texture} attach="environment" />;
}

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

export function CreatorViewport({ shape, appearance, expression, focus = "body", onBody, onError }: Props) {
  return (
    <Canvas shadows camera={{ position: [0, 1.1, 3.4], fov: 35 }} gl={{ preserveDrawingBuffer: true }} scene={{ environmentIntensity: 0.35 }}>
      <color attach="background" args={["#1f1f23"]} />
      <hemisphereLight args={["#ffffff", "#444444", 0.8]} />
      <directionalLight position={[2.5, 4, 3]} intensity={2.2} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.6, 48]} />
        <meshStandardMaterial color="#2c2c31" />
      </mesh>
      <MakeHumanBody params={shape} appearance={appearance} expression={expression} onBody={onBody} onError={onError} />
      <OrbitControls target={VIEWS.body.target} minDistance={0.3} maxDistance={6} enablePan={false} makeDefault />
      <CameraRig focus={focus} />
      <RoomLight />
    </Canvas>
  );
}
