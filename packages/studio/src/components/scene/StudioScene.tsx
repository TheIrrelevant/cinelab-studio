/**
 * @file StudioScene.tsx
 * @description Three.js scene graph: lighting, backdrop, lights, cameras, model and navigation.
 * @scope cinelab-studio
 * @depends Cyclorama, TripodLight, StudioCamera, StudioModel, StudioNavigation
 */

"use client";

import { useState } from "react";
import type { Character } from "@cinelab/character/schema";
import type { StudioBackdrop, StudioLight, StudioModel } from "../../scene-storage";
import { CameraFeedCapture, StudioCameraRig, type StudioCameraAsset } from "../StudioCamera";
import { StudioCharacter } from "../StudioModel";
import type { TransformMode } from "../studio-constants";
import { TripodLight } from "../lights/TripodLight";
import { Cyclorama } from "./Cyclorama";
import { StudioNavigation } from "./StudioNavigation";

export function StudioScene({
  lights,
  cameras,
  previewCamera,
  previewCanvas,
  selectedId,
  selectedCameraId,
  onSelect,
  onSelectCamera,
  onMoveLight,
  onRotateLight,
  onMoveCamera,
  onRotateCamera,
  onOpenLightSettings,
  onOpenCameraSettings,
  transformMode,
  model,
  modelCharacter,
  modelSelected,
  onSelectModel,
  onMoveModel,
  onRotateModel,
  backdrop,
  backdropSelected,
  onSelectBackdrop,
  onOpenBackdropSettings,
}: {
  backdrop: StudioBackdrop;
  backdropSelected: boolean;
  onSelectBackdrop: () => void;
  onOpenBackdropSettings: () => void;
  model: StudioModel | null;
  modelCharacter: Character | undefined;
  modelSelected: boolean;
  onSelectModel: () => void;
  onMoveModel: (position: [number, number, number]) => void;
  onRotateModel: (rotation: [number, number, number]) => void;
  lights: StudioLight[];
  cameras: StudioCameraAsset[];
  previewCamera: StudioCameraAsset | undefined;
  previewCanvas: HTMLCanvasElement | null;
  selectedId: string | null;
  selectedCameraId: string | null;
  onSelect: (id: string | null) => void;
  onSelectCamera: (id: string) => void;
  onMoveLight: (id: string, position: [number, number, number]) => void;
  onRotateLight: (id: string, rotation: [number, number, number]) => void;
  onMoveCamera: (id: string, position: [number, number, number]) => void;
  onRotateCamera: (id: string, rotation: [number, number, number]) => void;
  onOpenLightSettings: (id: string) => void;
  onOpenCameraSettings: (id: string) => void;
  transformMode: TransformMode;
}) {
  const [transforming, setTransforming] = useState(false);

  return (
    <>
      <color attach="background" args={["#292b2d"]} />
      <fog attach="fog" args={["#292b2d", 18, 34]} />
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[4, 9, 6]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <Cyclorama
        backdrop={backdrop}
        selected={backdropSelected}
        onSelect={onSelectBackdrop}
        onOpenSettings={onOpenBackdropSettings}
      />
      {lights.map((light) => (
        <TripodLight
          key={light.id}
          light={light}
          selected={light.id === selectedId}
          onSelect={() => onSelect(light.id)}
          onTransforming={setTransforming}
          onMoveEnd={(position) => onMoveLight(light.id, position)}
          onRotateEnd={(rotation) => onRotateLight(light.id, rotation)}
          onOpenSettings={() => onOpenLightSettings(light.id)}
          transformMode={transformMode}
        />
      ))}
      {cameras.map((camera) => (
        <StudioCameraRig
          key={camera.id}
          camera={camera}
          selected={camera.id === selectedCameraId}
          transformMode={transformMode}
          onSelect={() => onSelectCamera(camera.id)}
          onOpenSettings={() => onOpenCameraSettings(camera.id)}
          onTransforming={setTransforming}
          onMoveEnd={(position) => onMoveCamera(camera.id, position)}
          onRotateEnd={(rotation) => onRotateCamera(camera.id, rotation)}
        />
      ))}
      {model && modelCharacter ? (
        <StudioCharacter
          character={modelCharacter}
          model={model}
          selected={modelSelected}
          transformMode={transformMode}
          onSelect={onSelectModel}
          onTransforming={setTransforming}
          onMoveEnd={onMoveModel}
          onRotateEnd={onRotateModel}
        />
      ) : null}
      {previewCamera ? <CameraFeedCapture camera={previewCamera} canvas={previewCanvas} /> : null}
      <StudioNavigation enabled={!transforming} />
    </>
  );
}
