/**
 * @file page.tsx (lab/human)
 * @description MakeHuman spike test page: large 3D viewport with the morphable body and a right
 *   panel for body shape and appearance (skin, eyes, hair). Shows the measured height and can
 *   overlay bone axes, show a joint limit demo pose, and pose the body: joint handles select,
 *   a gizmo rotates (moves the root and IK targets), FK/IK per limb, a numeric bar edits X/Y/Z,
 *   with undo/redo and resets.
 *   Needs `pnpm human:build` output in public/human.
 * @scope cinelab-studio/web
 * @depends @cinelab/human/components/MakeHumanBody, @cinelab/human/makehuman/macro,
 *   @cinelab/human/makehuman/appearance, BodySliders, AppearancePanel
 */

"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { MakeHumanBody } from "@cinelab/human/components/MakeHumanBody";
import { limitDemoPose } from "@cinelab/human/makehuman/body-pose";
import { DEFAULT_BODY, type BodyParams } from "@cinelab/human/makehuman/macro";
import { DEFAULT_APPEARANCE, type Appearance, type AppearanceCatalog } from "@cinelab/human/makehuman/appearance";
import { AppearancePanel } from "./AppearancePanel";
import { BodySliders } from "./BodySliders";
import { LabCamera, type LabView } from "./LabCamera";
import { LabProbe } from "./LabProbe";
import { LabToggle } from "./LabToggle";
import { PosePanel } from "./PosePanel";
import { usePoseEditor } from "./use-pose-editor";
import type { GizmoMode, GizmoSpace } from "@cinelab/human/components/PoseGizmo";
import { rotationOf } from "@cinelab/human/makehuman/pose-editor";
import { limbOfEffector } from "@cinelab/human/makehuman/limbs";

export default function HumanLabPage() {
  const [params, setParams] = useState<BodyParams>(DEFAULT_BODY);
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [catalog, setCatalog] = useState<AppearanceCatalog | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [view, setView] = useState<LabView>("body");
  const [boneAxes, setBoneAxes] = useState(false);
  const [demoPose, setDemoPose] = useState(false);
  const [handles, setHandles] = useState(false);
  const [fingerHandles, setFingerHandles] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const { editor, pose, primary, actions } = usePoseEditor();
  const [mode, setMode] = useState<GizmoMode>("rotate");
  const [space, setSpace] = useState<GizmoSpace>("local");
  const ikLimb = primary ? limbOfEffector(primary) : null;
  const ikTarget = ikLimb ? editor.current.ik[ikLimb] : undefined;
  const canMove = primary === "root" || Boolean(ikTarget);
  const gizmoMode = canMove ? mode : "rotate";
  const toggleDemo = useCallback(
    (on: boolean) => {
      setDemoPose(on);
      if (on) actions.loadPose(limitDemoPose());
      else actions.resetAll();
    },
    [actions],
  );
  const [error, setError] = useState<string | null>(null);
  const onShape = useCallback((result: { heightMetres: number }) => setHeight(result.heightMetres), []);
  const onError = useCallback((cause: Error) => setError(cause.message), []);

  return (
    <div className="flex h-screen w-full">
      <div className="relative flex-1" data-testid="human-viewport">
        <Canvas onPointerMissed={() => actions.select(null)} shadows camera={{ position: [0, 1.1, 3.6], fov: 35 }} gl={{ preserveDrawingBuffer: true }}>
          <color attach="background" args={["#2a2a2e"]} />
          <hemisphereLight args={["#ffffff", "#444444", 0.8]} />
          <directionalLight position={[2.5, 4, 3]} intensity={2.2} castShadow />
          <directionalLight position={[-3, 2, -2]} intensity={0.8} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[2, 48]} />
            <meshStandardMaterial color="#3a3a3f" />
          </mesh>
          <MakeHumanBody
            params={params}
            appearance={appearance}
            onShape={onShape}
            onCatalog={setCatalog}
            onError={onError}
            showBoneAxes={boneAxes}
            pose={pose}
            rootOffset={editor.current.rootOffset}
            onBody={actions.setBody}
            ikTarget={
              handles && ikLimb && ikTarget && gizmoMode === "translate"
                ? { position: ikTarget, onDragStart: actions.beginDrag, onMove: (p) => actions.moveIkLive(ikLimb, p) }
                : undefined
            }
            handles={handles ? { fingers: fingerHandles, selected: editor.selection, onSelect: actions.select, onHover: setHovered } : undefined}
            gizmo={
              handles && primary
                ? {
                    bone: primary,
                    mode: gizmoMode,
                    space,
                    onDragStart: actions.beginDrag,
                    onRotate: (delta) => actions.rotateLive(primary, delta),
                    onMove: actions.moveRootLive,
                  }
                : undefined
            }
          />
          <LabProbe />
          <LabCamera view={view} height={height ?? 1.66} />
        </Canvas>
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {(["body", "side", "portrait"] as const).map((option) => (
            <button
              key={option}
              type="button"
              data-testid={`view-${option}`}
              onClick={() => setView(option)}
              className={`whitespace-nowrap rounded px-3 py-1 text-xs ${view === option ? "bg-neutral-100 text-neutral-900" : "bg-neutral-800 text-neutral-300"}`}
            >
              {{ body: "Full body", side: "Side", portrait: "Portrait" }[option]}
            </button>
          ))}
          <LabToggle id="toggle-handles" on={handles} onChange={setHandles} label="Handles" />
          <LabToggle id="toggle-finger-handles" on={fingerHandles} onChange={setFingerHandles} label="Finger handles" />
          <LabToggle id="toggle-bone-axes" on={boneAxes} onChange={setBoneAxes} label="Bone axes" />
          <LabToggle id="toggle-limit-demo" on={demoPose} onChange={toggleDemo} label="Limit demo" />
        </div>
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
        <p className="text-xs text-neutral-400" data-testid="selected-bones">
          Selected: {editor.selection.length ? editor.selection.join(", ") : "none"}
          {hovered ? ` (hover ${hovered})` : ""}
        </p>
        <p className="text-xs text-neutral-400" data-testid="body-height">
          Height: {height === null ? "loading..." : `${(height * 100).toFixed(0)} cm`}
        </p>
        <PosePanel
          primary={primary}
          rotation={primary ? rotationOf(editor, primary) : null}
          mode={gizmoMode}
          space={space}
          canMove={canMove}
          ik={editor.current.ik}
          onIk={actions.setIk}
          canUndo={editor.past.length > 0}
          canRedo={editor.future.length > 0}
          onMode={setMode}
          onSpace={setSpace}
          onRotate={(delta) => primary && actions.rotate(primary, delta)}
          onUndo={actions.undo}
          onRedo={actions.redo}
          onResetSelected={actions.resetSelected}
          onResetAll={actions.resetAll}
        />
        <BodySliders params={params} onChange={setParams} onReset={() => setParams(DEFAULT_BODY)} />
        <h2 className="border-t border-neutral-800 pt-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Appearance</h2>
        <AppearancePanel appearance={appearance} catalog={catalog} onChange={setAppearance} />
      </aside>
    </div>
  );
}
