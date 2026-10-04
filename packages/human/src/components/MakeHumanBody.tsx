/**
 * @file MakeHumanBody.tsx
 * @description react-three-fiber MakeHuman body: loads the generated GLB + morph pack once per
 *   URL and re-shapes the mesh and skeleton whenever the body parameters change.
 * @scope cinelab-studio
 * @depends react, three, ../makehuman/load-body, ../makehuman/body-shape, ../makehuman/macro
 */

"use client";

import { useEffect, useState } from "react";
import { applyBodyShape, type BodyShapeResult } from "../makehuman/body-shape";
import { loadBody, type LoadedBody } from "../makehuman/load-body";
import type { BodyParams } from "../makehuman/macro";

type Props = {
  params: BodyParams;
  /** Folder with the converter output, ending with "/". */
  baseUrl?: string;
  onShape?: (result: BodyShapeResult) => void;
  onError?: (error: Error) => void;
};

export function MakeHumanBody({ params, baseUrl = "/human/", onShape, onError }: Props) {
  const [body, setBody] = useState<LoadedBody | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadBody(baseUrl).then(
      (loaded) => {
        if (cancelled) return;
        loaded.mesh.castShadow = true;
        loaded.mesh.receiveShadow = true;
        setBody(loaded);
      },
      (error: Error) => !cancelled && onError?.(error),
    );
    return () => {
      cancelled = true;
    };
    // onError is a notification only; reloading on its identity change is not wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl]);

  useEffect(() => {
    if (!body) return;
    onShape?.(applyBodyShape(body.mesh, body.data, params));
    // onShape is a notification only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, params]);

  return body ? <primitive object={body.scene} /> : null;
}
