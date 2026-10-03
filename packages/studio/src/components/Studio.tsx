/**
 * @file Studio.tsx
 * @description Interactive 3D photo studio: composes scene state, selection, the viewport, panels and toolbar.
 * @scope cinelab-studio
 * @depends useSceneState, useStudioUi, useAssetActions, StudioScene, StudioPanels, StudioHeader, StudioToolbar
 */

"use client";

import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { StoreHydration } from "@cinelab/character/components/StoreHydration";
import { useCharacterStore } from "@cinelab/character/character-store";
import { CameraPreview } from "./StudioCamera";
import { StudioScene } from "./scene/StudioScene";
import type { ToolId } from "./studio-constants";
import { StudioHeader } from "./studio/StudioHeader";
import { StudioPanels, type ScenePanel } from "./studio/StudioPanels";
import { StudioToolbar } from "./studio/StudioToolbar";
import { hasTransformable, selectedId } from "./studio/ui-state";
import { useAssetActions } from "./studio/useAssetActions";
import { useSceneState } from "./studio/useSceneState";
import { useStudioUi } from "./studio/useStudioUi";

export type { ScenePanel } from "./studio/StudioPanels";
export { STUDIO_CHARACTER_PARAM } from "./studio-constants";

export function Studio({ scenePanel }: { scenePanel?: ScenePanel } = {}) {
  const ui = useStudioUi();
  const scene = useSceneState(ui.setSelection);
  const characters = useCharacterStore((state) => state.characters);
  const modelCharacter = scene.model ? characters.find((c) => c.id === scene.model?.characterId) : undefined;
  const actions = useAssetActions(scene, ui, modelCharacter);
  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const { selection, panel } = ui;
  const selectedCameraId = selectedId(selection, "camera");
  const previewCamera =
    scene.cameras.find((camera) => camera.id === selectedCameraId && camera.previewVisible) ??
    scene.cameras.find((camera) => camera.previewVisible);

  const onTool = (tool: ToolId) => {
    if (tool === "light") actions.addLight();
    if (tool === "camera") actions.addCamera();
    if (tool === "model" && !scene.loading) ui.setPanel({ kind: "modelPicker" });
    if (tool === "pose" && !scene.loading && modelCharacter) ui.setPanel({ kind: "posePicker" });
    if (tool === "move") ui.setTransformMode("translate");
    if (tool === "rotate") ui.setTransformMode("rotate");
    if (tool === "delete") actions.deleteSelected();
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#292b2d] text-white">
      <StoreHydration />
      {scene.storageNotice ? <p role="alert" className="absolute inset-x-4 bottom-28 z-20 mx-auto max-w-xl rounded-xl border border-amber-300/30 bg-neutral-950/95 p-3 text-sm text-amber-100">{scene.storageNotice}</p> : null}
      <Canvas shadows dpr={[1, 2]} camera={{ position: [8.5, 5.8, 10.5], fov: 42, near: 0.1, far: 100 }} gl={{ antialias: true }}>
        <StudioScene
          lights={scene.lights}
          cameras={scene.cameras}
          previewCamera={previewCamera}
          previewCanvas={previewCanvas}
          selectedId={selectedId(selection, "light")}
          selectedCameraId={selectedCameraId}
          onSelect={(id) => (id ? ui.selectObject({ kind: "light", id }) : ui.setSelection({ kind: "none" }))}
          onSelectCamera={(id) => ui.selectObject({ kind: "camera", id })}
          onMoveLight={actions.moveLight}
          onRotateLight={actions.rotateLight}
          onMoveCamera={actions.moveCamera}
          onRotateCamera={actions.rotateCamera}
          onOpenLightSettings={(id) => ui.setPanel({ kind: "light", id })}
          onOpenCameraSettings={(id) => ui.setPanel({ kind: "camera", id })}
          transformMode={ui.transformMode}
          model={scene.model}
          modelCharacter={modelCharacter}
          modelSelected={selection.kind === "model"}
          onSelectModel={() => ui.selectObject({ kind: "model" })}
          onMoveModel={actions.moveModel}
          onRotateModel={actions.rotateModel}
          backdrop={scene.backdrop}
          backdropSelected={selection.kind === "backdrop"}
          onSelectBackdrop={ui.clickBackdrop}
          onOpenBackdropSettings={() => ui.setPanel({ kind: "backdrop" })}
        />
      </Canvas>

      {previewCamera ? (
        <CameraPreview
          camera={previewCamera}
          onChange={(patch) => actions.updateCamera(previewCamera.id, patch)}
          canvasRef={setPreviewCanvas}
        />
      ) : null}

      <StudioPanels
        panel={panel}
        scene={scene}
        actions={actions}
        characters={characters}
        modelCharacter={modelCharacter}
        scenePanel={scenePanel}
        onClose={ui.closePanel}
      />

      <StudioHeader
        panelLabel={scenePanel?.label}
        panelOpen={panel?.kind === "scene"}
        loading={scene.loading}
        onTogglePanel={ui.toggleScenePanel}
        lightCount={scene.lights.length}
        cameraCount={scene.cameras.length}
        modelName={modelCharacter?.name}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-24 hidden text-center sm:block">
        <p className="inline-flex rounded-full bg-black/25 px-3 py-1.5 text-xs text-white/50 backdrop-blur-lg">
          WASD to move · Left drag to look · Scroll to zoom
        </p>
      </div>

      <StudioToolbar
        loading={scene.loading}
        canPose={modelCharacter !== undefined}
        hasTransformable={hasTransformable(selection)}
        transformMode={ui.transformMode}
        modelPickerOpen={panel?.kind === "modelPicker"}
        posePickerOpen={panel?.kind === "posePicker"}
        onTool={onTool}
      />
    </main>
  );
}
