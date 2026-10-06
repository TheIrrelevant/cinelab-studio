/**
 * @file MakeHumanBody.tsx
 * @description react-three-fiber MakeHuman body: loads the generated GLB, morph and proxy packs
 *   once per URL, then re-shapes the body when `params` change and updates skin, eyes, hair,
 *   eyebrows and eyelashes when `appearance` changes. Optional clamped pose and root offset, joint handles, transform or IK target gizmo and
 *   bone axes overlay.
 * @scope cinelab-studio
 * @depends react, ../makehuman/load-body, ../makehuman/body-controller, ../makehuman/bone-axes, ../makehuman/body-pose, ./JointHandles, ./PoseGizmo, ./IkTargetGizmo, ../makehuman/shape-model,
 *   ../makehuman/appearance
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { appearanceCatalog, DEFAULT_APPEARANCE, type Appearance, type AppearanceCatalog } from "../makehuman/appearance";
import { BodyController } from "../makehuman/body-controller";
import { attachBoneAxes } from "../makehuman/bone-axes";
import { applyBodyPose, type BodyPose } from "../makehuman/body-pose";
import { JointHandles, type JointHandlesProps } from "./JointHandles";
import { PoseGizmo, type PoseGizmoProps } from "./PoseGizmo";
import { IkTargetGizmo, type IkTargetGizmoProps } from "./IkTargetGizmo";
import type { BodyShapeResult } from "../makehuman/body-shape";
import { loadBody, type LoadedBody } from "../makehuman/load-body";
import type { ShapeParams } from "../makehuman/shape-model";

type Props = {
  params: ShapeParams;
  appearance?: Appearance;
  /** Folder with the converter output, ending with "/". */
  baseUrl?: string;
  onShape?: (result: BodyShapeResult) => void;
  /** Called once the assets are loaded, with the available hair, eyebrow, eyelash and eye choices. */
  onCatalog?: (catalog: AppearanceCatalog) => void;
  onError?: (error: Error) => void;
  /** Debug overlay: RGB axes on every bone. */
  showBoneAxes?: boolean;
  /** Rotation deltas per rig bone name, clamped to joint limits; missing bones stay at rest. */
  pose?: BodyPose;
  /** On-body joint handles; omitted = no handles. */
  handles?: Omit<JointHandlesProps, "skeleton" | "boneNames">;
  /** Root offset from its rest position in metres. */
  rootOffset?: readonly number[];
  /** Transform gizmo on one bone; omitted = no gizmo. */
  gizmo?: PoseGizmoProps;
  /** Move gizmo on an IK target (replaces `gizmo` while set). */
  ikTarget?: IkTargetGizmoProps;
  /** The loaded body, once (for IK solving and measurements). */
  onBody?: (body: LoadedBody) => void;
};

type Ready = { body: LoadedBody; controller: BodyController };

export function MakeHumanBody({ params, appearance = DEFAULT_APPEARANCE, baseUrl = "/human/", onShape, onCatalog, onError, showBoneAxes = false, pose, handles, rootOffset, gizmo, ikTarget, onBody }: Props) {
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
        onBody?.(body);
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
    // Shape first: `onShape?.(setShape())` would skip the call when no listener is passed.
    const result = ready.controller.setShape(params);
    onShape?.(result);
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
    if (!ready) return;
    applyBodyPose(ready.body.mesh.skeleton, ready.body.data.manifest.bones, pose ?? {}, rootOffset);
    // params: the re-shape refit resets the root position, so the offset is applied again.
  }, [ready, pose, rootOffset, params]);

  useEffect(() => {
    if (!ready || !showBoneAxes) return;
    return attachBoneAxes(ready.body.mesh.skeleton.bones);
  }, [ready, showBoneAxes]);

  const boneNames = useMemo(() => ready?.body.data.manifest.bones.map((bone) => bone.name) ?? [], [ready]);

  if (!ready) return null;
  return (
    <>
      <primitive object={ready.body.scene} />
      {handles ? <JointHandles skeleton={ready.body.mesh.skeleton} boneNames={boneNames} {...handles} /> : null}
      {ikTarget ? <IkTargetGizmo {...ikTarget} /> : null}
      {!ikTarget && gizmo && boneNames.includes(gizmo.bone) ? (
        <PoseGizmo object={ready.body.mesh.skeleton.bones[boneNames.indexOf(gizmo.bone)]} {...gizmo} />
      ) : null}
    </>
  );
}
