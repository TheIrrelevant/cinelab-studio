/**
 * @file use-pose-editor.ts
 * @description React state for the human lab pose editor: wraps the pure pose editor, exposes
 *   actions for handles, gizmos, numeric bar and toolbar, keeps IK limbs settled after every edit
 *   (feet stay planted when the root moves), and binds shortcuts (Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z,
 *   Ctrl+Y; Escape clears the selection).
 * @scope cinelab-studio/web
 * @depends react, three, @cinelab/human/makehuman/pose-editor, @cinelab/human/makehuman/pose-ik,
 *   @cinelab/human/makehuman/limbs, @cinelab/human/makehuman/load-body
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Quaternion, Vector3 } from "three";
import type { BodyPose } from "@cinelab/human/makehuman/body-pose";
import type { LimbId } from "@cinelab/human/makehuman/limbs";
import type { LoadedBody } from "@cinelab/human/makehuman/load-body";
import * as P from "@cinelab/human/makehuman/pose-editor";
import { effectorPosition, settleIk, type PoseRig } from "@cinelab/human/makehuman/pose-ik";

/** Bones whose edit re-targets their IK limb; `null` = no IK settle after the edit. */
type Changed = readonly string[] | null;

export function usePoseEditor() {
  const [editor, setEditor] = useState(P.createPoseEditor);
  const latest = useRef(editor);
  const rig = useRef<PoseRig | null>(null);
  const run = useCallback((fn: (e: P.PoseEditor) => P.PoseEditor, changed: Changed = null) => {
    let next = fn(latest.current);
    if (changed && rig.current) next = settleIk(rig.current, next, changed);
    latest.current = next;
    setEditor(next);
  }, []);

  const actions = useMemo(
    () => ({
      setBody: (body: LoadedBody) => {
        rig.current = { skeleton: body.mesh.skeleton, bones: body.data.manifest.bones };
      },
      select: (bone: string | null, additive = false) => run((e) => P.select(e, bone, additive)),
      beginDrag: () => run(P.beginEdit),
      rotateLive: (bone: string, delta: Quaternion) => run((e) => P.setRotation(e, bone, delta, false), [bone]),
      rotate: (bone: string, delta: Quaternion) => run((e) => P.setRotation(e, bone, delta), [bone]),
      moveRootLive: (offset: Vector3) => run((e) => P.setRootOffset(e, offset, false), []),
      moveIkLive: (limb: LimbId, target: Vector3) => run((e) => P.setIkTarget(e, limb, target, false), []),
      setIk: (limb: LimbId, on: boolean) =>
        run((e) => P.setIkTarget(e, limb, on && rig.current ? effectorPosition(rig.current, e, limb) : null)),
      loadPose: (pose: BodyPose, rootOffset?: readonly [number, number, number]) => run((e) => P.loadPose(e, pose, rootOffset), Object.keys(pose)),
      resetSelected: () => run(P.resetSelected, latest.current.selection),
      resetAll: () => run(P.resetAll),
      undo: () => run(P.undo),
      redo: () => run(P.redo),
    }),
    [run],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) actions.redo();
        else actions.undo();
      } else if (key === "escape") {
        actions.select(null);
      } else if (event.ctrlKey && key === "y") {
        event.preventDefault();
        actions.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions]);

  const snapshot = editor.current;
  const pose = useMemo(() => P.toBodyPose(snapshot), [snapshot]);
  return { editor, pose, primary: P.primarySelection(editor), actions };
}
