/**
 * @file useAssetActions.ts
 * @description Studio commands: add, edit, transform and delete lights, cameras and the model.
 * @scope cinelab-studio
 * @depends useSceneState, useStudioUi, framing, light-presets, camera-rig, new-assets
 */

"use client";

import type { Character } from "@cinelab/character/schema";
import { mannequinSpec } from "@cinelab/character/mannequin";
import type { PoseId } from "@cinelab/human/poses";
import { lensOriginOffset } from "../../camera-rig";
import { framingPlacement, type FramingId } from "../../framing";
import { lightRolePlacement, type LightRole } from "../../light-presets";
import type { CameraPatch } from "../StudioCamera";
import {
  DEFAULT_LIGHT_HEIGHT,
  DEFAULT_MODEL_POSITION,
  DEFAULT_SUBJECT_HEIGHT,
  FRAMING_FIELDS,
  type LightPatch,
} from "../studio-constants";
import { newCamera, newLight } from "./new-assets";
import type { SceneState } from "./useSceneState";
import type { StudioUi } from "./useStudioUi";
import { NO_SELECTION, keepPanel, selectedId } from "./ui-state";

type Vec3 = [number, number, number];

function patchById<T extends { id: string }>(items: T[], id: string, patch: (item: T) => T): T[] {
  return items.map((item) => (item.id === id ? patch(item) : item));
}

export function useAssetActions(scene: SceneState, ui: StudioUi, modelCharacter: Character | undefined) {
  const { setLights, setCameras, setModel } = scene;
  const subject = () => scene.model ?? { position: DEFAULT_MODEL_POSITION, rotation: [0, 0, 0] as Vec3 };

  const addLight = () => {
    if (scene.loading) return;
    const light = newLight(scene.nextLightId(), scene.lights.length);
    setLights((current) => [...current, light]);
    ui.selectAdded({ kind: "light", id: light.id });
  };

  const addCamera = () => {
    if (scene.loading) return;
    const camera = newCamera(scene.nextCameraId(), scene.cameras.length);
    setCameras((current) => [...current, camera]);
    ui.selectAdded({ kind: "camera", id: camera.id });
  };

  const updateLight = (id: string, patch: LightPatch) =>
    setLights((current) => patchById(current, id, (light) => ({ ...light, ...patch })));
  const moveLight = (id: string, position: Vec3) =>
    setLights((current) => patchById(current, id, (light) => ({ ...light, position })));
  const rotateLight = (id: string, rotation: Vec3) =>
    setLights((current) => patchById(current, id, (light) => ({ ...light, rotation })));
  const resetLight = (id: string) =>
    setLights((current) => patchById(current, id, (light) => ({
      ...light,
      position: [...light.homePosition] as Vec3,
      rotation: [0, 0, 0] as Vec3,
      headRotation: [0, 0, 0] as Vec3,
      height: DEFAULT_LIGHT_HEIGHT,
    })));
  const applyLightRole = (id: string, role: LightRole) =>
    setLights((current) => patchById(current, id, (light) => ({ ...light, ...lightRolePlacement(role, subject()) })));

  const updateCamera = (id: string, patch: CameraPatch) => {
    // Manual changes to what the frame shows invalidate the framing preset label.
    const reframes = FRAMING_FIELDS.some((field) => field in patch);
    setCameras((current) => patchById(current, id, (camera) => ({ ...camera, ...(reframes ? { framing: null } : {}), ...patch })));
  };
  const moveCamera = (id: string, position: Vec3) =>
    setCameras((current) => patchById(current, id, (camera) => ({ ...camera, position, framing: null })));
  const rotateCamera = (id: string, rotation: Vec3) =>
    setCameras((current) => patchById(current, id, (camera) => ({ ...camera, rotation, framing: null })));
  const resetCamera = (id: string) =>
    setCameras((current) => patchById(current, id, (camera) => ({
      ...camera,
      position: [...camera.homePosition] as Vec3,
      rotation: [0, Math.PI, 0] as Vec3,
      headRotation: [0, 0, 0] as Vec3,
      height: 1.55,
      framing: null,
    })));
  const applyFraming = (id: string, framing: FramingId) => {
    const height = modelCharacter ? mannequinSpec(modelCharacter).height : DEFAULT_SUBJECT_HEIGHT;
    setCameras((current) => patchById(current, id, (camera) => ({
      ...camera,
      ...framingPlacement(framing, subject(), height, camera.aperture, (lens, zoomMm) =>
        lensOriginOffset(camera.body, lens, zoomMm)),
    })));
  };

  const pickModel = (characterId: string) => {
    setModel((current) => ({
      characterId,
      position: current?.position ?? DEFAULT_MODEL_POSITION,
      rotation: current?.rotation ?? [0, 0, 0],
      pose: current?.pose ?? "standing",
    }));
    ui.selectObject({ kind: "model" });
    ui.setTransformMode("translate");
    ui.setPanel((current) => keepPanel(current, ["posePicker", "scene"]));
  };
  const removeModel = () => {
    setModel(null);
    if (ui.selection.kind === "model" || ui.selection.kind === "backdrop") ui.setSelection(NO_SELECTION);
    ui.setPanel((current) => keepPanel(current, ["light", "camera", "scene"]));
  };
  const setPose = (pose: PoseId) => setModel((current) => (current ? { ...current, pose } : current));
  const moveModel = (position: Vec3) => setModel((current) => (current ? { ...current, position } : current));
  const rotateModel = (rotation: Vec3) => setModel((current) => (current ? { ...current, rotation } : current));

  const deleteSelected = () => {
    if (scene.loading) return;
    const lightId = selectedId(ui.selection, "light");
    const cameraId = selectedId(ui.selection, "camera");
    const deletingModel = ui.selection.kind === "model";
    if (lightId) setLights((current) => current.filter((light) => light.id !== lightId));
    if (cameraId) setCameras((current) => current.filter((camera) => camera.id !== cameraId));
    if (deletingModel) setModel(null);
    ui.setSelection(NO_SELECTION);
    ui.setTransformMode("translate");
    ui.setPanel((current) => keepPanel(current, deletingModel ? ["modelPicker", "scene"] : ["modelPicker", "posePicker", "scene"]));
  };

  return {
    addLight, addCamera, deleteSelected,
    updateLight, moveLight, rotateLight, resetLight, applyLightRole,
    updateCamera, moveCamera, rotateCamera, resetCamera, applyFraming,
    pickModel, removeModel, setPose, moveModel, rotateModel,
  };
}

export type AssetActions = ReturnType<typeof useAssetActions>;
