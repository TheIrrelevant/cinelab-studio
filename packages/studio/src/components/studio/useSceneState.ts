/**
 * @file useSceneState.ts
 * @description Studio scene state with deferred load, write-through save, asset id counters
 *   and the ?character= deep link.
 * @scope cinelab-studio
 * @depends scene-storage, character-store, studio-constants, ui-state
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCharacterStore } from "@cinelab/character/character-store";
import {
  nextAssetCounter,
  readScene,
  writeScene,
  type StudioBackdrop,
  type StudioLight,
  type StudioModel,
  type StudioSceneData,
} from "../../scene-storage";
import type { StudioCameraAsset } from "../StudioCamera";
import { DEFAULT_MODEL_POSITION, STUDIO_CHARACTER_PARAM } from "../studio-constants";
import type { Selection } from "./ui-state";

export type StorageStatus = "loading" | "ready" | "blocked";

export function useSceneState(setSelection: (selection: Selection) => void) {
  const lightCounter = useRef(0);
  const cameraCounter = useRef(0);
  const [lights, setLights] = useState<StudioLight[]>([]);
  const [cameras, setCameras] = useState<StudioCameraAsset[]>([]);
  const [model, setModel] = useState<StudioModel | null>(null);
  const [backdrop, setBackdrop] = useState<StudioBackdrop>({ color: "gray" });
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("loading");
  const [storageNotice, setStorageNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const scene = readScene(window.localStorage);
        lightCounter.current = nextAssetCounter(scene.lights);
        cameraCounter.current = nextAssetCounter(scene.cameras);
        setLights(scene.lights);
        setCameras(scene.cameras);
        setBackdrop(scene.backdrop);
        // Character store is hydrated by <StoreHydration/> before this deferred read.
        const known = new Set(useCharacterStore.getState().characters.map((character) => character.id));
        const requested = new URLSearchParams(window.location.search).get(STUDIO_CHARACTER_PARAM);
        const restored = scene.model && known.has(scene.model.characterId) ? scene.model : null;
        if (requested && known.has(requested)) {
          setModel({
            characterId: requested,
            position: restored?.position ?? DEFAULT_MODEL_POSITION,
            rotation: restored?.rotation ?? [0, 0, 0],
            pose: restored?.pose ?? "standing",
          });
          setSelection({ kind: "model" });
        } else {
          setModel(restored);
        }
        if (requested) {
          const url = new URL(window.location.href);
          url.searchParams.delete(STUDIO_CHARACTER_PARAM);
          window.history.replaceState(null, "", url);
        }
        setStorageStatus("ready");
      } catch {
        setStorageStatus("blocked");
        setStorageNotice("Saved scene could not be loaded. Your existing save is preserved; this session will not be saved.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [setSelection]);

  useEffect(() => {
    if (storageStatus !== "ready") return;
    try {
      writeScene(window.localStorage, { version: 1, lights, cameras, model, backdrop });
    } catch {
      // Defer the status update to keep the effect free of synchronous state changes.
      const timer = window.setTimeout(() => {
        setStorageStatus("blocked");
        setStorageNotice("Scene could not be saved. Your previous save is preserved; changes are only available in this session.");
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [backdrop, cameras, lights, model, storageStatus]);

  const sceneData = useMemo<StudioSceneData>(
    () => ({ version: 1, lights, cameras, model, backdrop }),
    [backdrop, cameras, lights, model],
  );

  return {
    lights, setLights,
    cameras, setCameras,
    model, setModel,
    backdrop, setBackdrop,
    sceneData,
    storageStatus,
    storageNotice,
    loading: storageStatus === "loading",
    nextLightId: () => `light-${lightCounter.current++}`,
    nextCameraId: () => `camera-${cameraCounter.current++}`,
  };
}

export type SceneState = ReturnType<typeof useSceneState>;
