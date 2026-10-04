/**
 * @file page.tsx (lab/human)
 * @description MakeHuman spike test page: large 3D viewport with the morphable body and a right
 *   slider panel. Shows the measured height. Needs `pnpm human:build` output in public/human.
 * @scope cinelab-studio/web
 * @depends @cinelab/human/components/MakeHumanBody, @cinelab/human/makehuman/macro, BodySliders
 */

"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { MakeHumanBody } from "@cinelab/human/components/MakeHumanBody";
import { DEFAULT_BODY, type BodyParams } from "@cinelab/human/makehuman/macro";
import { BodySliders } from "./BodySliders";

export default function HumanLabPage() {
  const [params, setParams] = useState<BodyParams>(DEFAULT_BODY);
  const [height, setHeight] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onShape = useCallback((result: { heightMetres: number }) => setHeight(result.heightMetres), []);
  const onError = useCallback((cause: Error) => setError(cause.message), []);

  return (
    <div className="flex h-screen w-full">
      <div className="relative flex-1" data-testid="human-viewport">
        <Canvas shadows camera={{ position: [0, 1.1, 3.6], fov: 35 }} gl={{ preserveDrawingBuffer: true }}>
          <color attach="background" args={["#2a2a2e"]} />
          <hemisphereLight args={["#ffffff", "#444444", 0.8]} />
          <directionalLight position={[2.5, 4, 3]} intensity={2.2} castShadow />
          <directionalLight position={[-3, 2, -2]} intensity={0.8} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[2, 48]} />
            <meshStandardMaterial color="#3a3a3f" />
          </mesh>
          <MakeHumanBody params={params} onShape={onShape} onError={onError} />
          <OrbitControls target={[0, 0.95, 0]} makeDefault />
        </Canvas>
        {error ? (
          <p className="absolute left-4 top-4 rounded bg-red-950 px-3 py-2 text-sm text-red-200">{error}</p>
        ) : null}
      </div>
      <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-neutral-800 p-4">
        <header className="flex items-baseline justify-between">
          <h1 className="text-sm font-semibold">Body (MakeHuman CC0)</h1>
          <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-200">
            Studio
          </Link>
        </header>
        <p className="text-xs text-neutral-400" data-testid="body-height">
          Height: {height === null ? "loading..." : `${(height * 100).toFixed(0)} cm`}
        </p>
        <BodySliders params={params} onChange={setParams} onReset={() => setParams(DEFAULT_BODY)} />
      </aside>
    </div>
  );
}
