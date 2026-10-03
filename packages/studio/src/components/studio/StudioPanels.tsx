/**
 * @file StudioPanels.tsx
 * @description Renders the single open side panel: light, camera, backdrop, model, pose or app panel.
 * @scope cinelab-studio
 * @depends LightSettingsPanel, StudioCamera, BackdropSettingsPanel, StudioModel, useAssetActions
 */

"use client";

import type { ReactNode } from "react";
import type { Character } from "@cinelab/character/schema";
import type { StudioSceneData } from "../../scene-storage";
import { BackdropSettingsPanel } from "../BackdropSettingsPanel";
import { LightSettingsPanel } from "../lights/LightSettingsPanel";
import { CameraSettingsPanel } from "../StudioCamera";
import { ModelPickerPanel, PosePickerPanel } from "../StudioModel";
import type { AssetActions } from "./useAssetActions";
import type { SceneState } from "./useSceneState";
import type { Panel } from "./ui-state";

/** Optional header panel supplied by the app, e.g. the render contract's Scene JSON view. */
export type ScenePanel = {
  label: string;
  render: (props: { scene: StudioSceneData; characters: readonly Character[]; onClose: () => void }) => ReactNode;
};

export function StudioPanels({
  panel,
  scene,
  actions,
  characters,
  modelCharacter,
  scenePanel,
  onClose,
}: {
  panel: Panel;
  scene: SceneState;
  actions: AssetActions;
  characters: readonly Character[];
  modelCharacter: Character | undefined;
  scenePanel?: ScenePanel;
  onClose: () => void;
}) {
  if (!panel) return null;
  if (panel.kind === "light") {
    const light = scene.lights.find((item) => item.id === panel.id);
    return light ? (
      <LightSettingsPanel
        key={light.id}
        light={light}
        onChange={(patch) => actions.updateLight(light.id, patch)}
        onClose={onClose}
        onResetTransform={() => actions.resetLight(light.id)}
        onApplyRole={(role) => actions.applyLightRole(light.id, role)}
      />
    ) : null;
  }
  if (panel.kind === "camera") {
    const camera = scene.cameras.find((item) => item.id === panel.id);
    return camera ? (
      <CameraSettingsPanel
        camera={camera}
        onChange={(patch) => actions.updateCamera(camera.id, patch)}
        onClose={onClose}
        onReset={() => actions.resetCamera(camera.id)}
        onApplyFraming={(framing) => actions.applyFraming(camera.id, framing)}
      />
    ) : null;
  }
  if (panel.kind === "backdrop") {
    return <BackdropSettingsPanel backdrop={scene.backdrop} onChange={scene.setBackdrop} onClose={onClose} />;
  }
  if (panel.kind === "modelPicker") {
    return (
      <ModelPickerPanel
        characters={characters}
        activeCharacterId={modelCharacter?.id ?? null}
        onPick={actions.pickModel}
        onRemove={actions.removeModel}
        onClose={onClose}
      />
    );
  }
  if (panel.kind === "posePicker") {
    return scene.model && modelCharacter ? (
      <PosePickerPanel pose={scene.model.pose} characterName={modelCharacter.name} onPick={actions.setPose} onClose={onClose} />
    ) : null;
  }
  return scenePanel ? scenePanel.render({ scene: scene.sceneData, characters, onClose }) : null;
}
