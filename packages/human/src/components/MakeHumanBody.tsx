/**
 * @file MakeHumanBody.tsx
 * @description react-three-fiber MakeHuman body: loads the generated GLB, morph and proxy packs
 *   once per URL, then re-shapes the body when `params` change and updates skin, eyes, hair,
 *   eyebrows and eyelashes when `appearance` changes. Optional bone axes overlay for debugging.
 * @scope cinelab-studio
 * @depends react, ../makehuman/load-body, ../makehuman/body-controller, ../makehuman/bone-axes, ../makehuman/macro,
 *   ../makehuman/appearance
 */

"use client";

import { useEffect, useState } from "react";
import { appearanceCatalog, DEFAULT_APPEARANCE, type Appearance, type AppearanceCatalog } from "../makehuman/appearance";
import { BodyController } from "../makehuman/body-controller";
import { attachBoneAxes } from "../makehuman/bone-axes";
import type { BodyShapeResult } from "../makehuman/body-shape";
import { loadBody, type LoadedBody } from "../makehuman/load-body";
import type { BodyParams } from "../makehuman/macro";

type Props = {
  params: BodyParams;
  appearance?: Appearance;
  /** Folder with the converter output, ending with "/". */
  baseUrl?: string;
  onShape?: (result: BodyShapeResult) => void;
  /** Called once the assets are loaded, with the available hair, eyebrow, eyelash and eye choices. */
  onCatalog?: (catalog: AppearanceCatalog) => void;
  onError?: (error: Error) => void;
  /** Debug overlay: RGB axes on every bone. */
  showBoneAxes?: boolean;
};

type Ready = { body: LoadedBody; controller: BodyController };

export function MakeHumanBody({ params, appearance = DEFAULT_APPEARANCE, baseUrl = "/human/", onShape, onCatalog, onError, showBoneAxes = false }: Props) {
  const [ready, setReady] = useState<Ready | null>(null);

  useEffect(() => {
    let cancelled = false;
    let controller: BodyController | null = null;
    loadBody(baseUrl)
      .then(async (body) => {
        if (cancelled) return;
        body.mesh.castShadow = true;
        body.mesh.receiveShadow = true;
        controller = new BodyController(body, baseUrl);
        await controller.init();
        if (cancelled) return;
        setReady({ body, controller });
        onCatalog?.(appearanceCatalog(body.proxyManifest));
      })
      .catch((error: Error) => !cancelled && onError?.(error));
    return () => {
      cancelled = true;
      controller?.dispose();
    };
    // onCatalog/onError are notifications only; reloading on their identity change is not wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl]);

  useEffect(() => {
    if (!ready) return;
    onShape?.(ready.controller.setShape(params));
    // onShape is a notification only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, params]);

  useEffect(() => {
    if (!ready) return;
    ready.controller.setAppearance(appearance).catch((error: Error) => onError?.(error));
    // onError is a notification only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, appearance]);

  useEffect(() => {
    if (!ready || !showBoneAxes) return;
    return attachBoneAxes(ready.body.mesh.skeleton.bones);
  }, [ready, showBoneAxes]);

  return ready ? <primitive object={ready.body.scene} /> : null;
}
