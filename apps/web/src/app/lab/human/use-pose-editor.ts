/**
 * @file use-pose-editor.ts
 * @description React state for the human lab pose editor: wraps the pure pose editor, exposes
 *   actions for handles, gizmo, numeric bar and toolbar, and binds undo/redo shortcuts
 *   (Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Ctrl+Y); Escape clears the selection.
 * @scope cinelab-studio/web
 * @depends react, three, @cinelab/human/makehuman/pose-editor, @cinelab/human/makehuman/body-pose
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Quaternion, Vector3 } from "three";
import type { BodyPose } from "@cinelab/human/makehuman/body-pose";
import * as P from "@cinelab/human/makehuman/pose-editor";

export function usePoseEditor() {
  const [editor, setEditor] = useState(P.createPoseEditor);
  const act = useCallback((fn: (e: P.PoseEditor) => P.PoseEditor) => setEditor(fn), []);
  const actions = useMemo(
    () => ({
      select: (bone: string | null, additive = false) => act((e) => P.select(e, bone, additive)),
      beginDrag: () => act(P.beginEdit),
      rotateLive: (bone: string, delta: Quaternion) => act((e) => P.setRotation(e, bone, delta, false)),
      rotate: (bone: string, delta: Quaternion) => act((e) => P.setRotation(e, bone, delta)),
      moveRootLive: (offset: Vector3) => act((e) => P.setRootOffset(e, offset, false)),
      loadPose: (pose: BodyPose) => act((e) => P.loadPose(e, pose)),
      resetSelected: () => act(P.resetSelected),
      resetAll: () => act(P.resetAll),
      undo: () => act(P.undo),
      redo: () => act(P.redo),
    }),
    [act],
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
