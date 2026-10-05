/**
 * @file pose-editor.ts
 * @description Pure pose editor state: selection (click selects, Shift adds or removes), pose
 *   rotations clamped to joint limits, root offset, undo/redo of exact snapshots, reset selected
 *   and reset all. Drags call `beginEdit` once and then update without recording; numeric edits
 *   record. Rotations are stored as plain [x, y, z, w] arrays so undo restores them bit for bit.
 * @scope cinelab-studio
 * @depends three, ./joint-limits, ./body-pose
 */

import { Quaternion, Vector3 } from "three";
import type { BodyPose } from "./body-pose";
import { clampBoneDelta } from "./joint-limits";

type Quat = readonly [number, number, number, number];
type Vec3 = readonly [number, number, number];
export type PoseSnapshot = { rotations: Readonly<Record<string, Quat>>; rootOffset: Vec3 };
export type PoseEditor = {
  current: PoseSnapshot;
  past: readonly PoseSnapshot[];
  future: readonly PoseSnapshot[];
  /** Last entry is the primary selection (gizmo and numeric bar). */
  selection: readonly string[];
};

const HISTORY_LIMIT = 200;
const EMPTY: PoseSnapshot = { rotations: {}, rootOffset: [0, 0, 0] };

export const createPoseEditor = (): PoseEditor => ({ current: EMPTY, past: [], future: [], selection: [] });

export const primarySelection = (editor: PoseEditor): string | null => editor.selection.at(-1) ?? null;

export function select(editor: PoseEditor, bone: string | null, additive = false): PoseEditor {
  if (!bone) return { ...editor, selection: [] };
  if (!additive) return { ...editor, selection: [bone] };
  const without = editor.selection.filter((b) => b !== bone);
  return { ...editor, selection: without.length === editor.selection.length ? [...without, bone] : without };
}

/** Records the current pose as an undo step (call once at the start of a drag). */
export function beginEdit(editor: PoseEditor): PoseEditor {
  return { ...editor, past: [...editor.past, editor.current].slice(-HISTORY_LIMIT), future: [] };
}

function update(editor: PoseEditor, next: PoseSnapshot, record: boolean): PoseEditor {
  return { ...(record ? beginEdit(editor) : editor), current: next };
}

const isIdentity = (q: Quat) => Math.abs(q[3]) > 1 - 1e-12;
const IDENTITY: Quat = [0, 0, 0, 1];

/** Sets a bone's pose delta, clamped to its joint limits. */
export function setRotation(editor: PoseEditor, bone: string, delta: Quaternion, record = true): PoseEditor {
  const clamped = clampBoneDelta(bone, delta).toArray() as unknown as Quat;
  const previous = editor.current.rotations[bone] ?? IDENTITY;
  // A clamped edit that changes nothing must not leave an empty undo step.
  if (clamped.every((value, i) => Math.abs(value - previous[i]) < 1e-12)) return editor;
  const rotations = { ...editor.current.rotations };
  if (isIdentity(clamped)) delete rotations[bone];
  else rotations[bone] = clamped;
  return update(editor, { ...editor.current, rotations }, record);
}

export function setRootOffset(editor: PoseEditor, offset: Vector3, record = true): PoseEditor {
  return update(editor, { ...editor.current, rootOffset: [offset.x, offset.y, offset.z] }, record);
}

/** Replaces the whole pose (e.g. a preset) as one undo step; bones are clamped. */
export function loadPose(editor: PoseEditor, pose: BodyPose): PoseEditor {
  let next: PoseEditor = { ...editor, current: { ...editor.current, rotations: {} } };
  for (const [bone, q] of Object.entries(pose)) next = setRotation(next, bone, q, false);
  return update(editor, next.current, true);
}

export function resetSelected(editor: PoseEditor): PoseEditor {
  if (editor.selection.length === 0) return editor;
  const rotations = { ...editor.current.rotations };
  for (const bone of editor.selection) delete rotations[bone];
  const rootOffset = editor.selection.includes("root") ? EMPTY.rootOffset : editor.current.rootOffset;
  return update(editor, { rotations, rootOffset }, true);
}

export const resetAll = (editor: PoseEditor): PoseEditor => update(editor, EMPTY, true);

export function undo(editor: PoseEditor): PoseEditor {
  const previous = editor.past.at(-1);
  if (!previous) return editor;
  return { ...editor, current: previous, past: editor.past.slice(0, -1), future: [editor.current, ...editor.future] };
}

export function redo(editor: PoseEditor): PoseEditor {
  const [next, ...rest] = editor.future;
  if (!next) return editor;
  return { ...editor, current: next, past: [...editor.past, editor.current], future: rest };
}

export function rotationOf(editor: PoseEditor, bone: string): Quaternion {
  const q = editor.current.rotations[bone];
  return q ? new Quaternion(q[0], q[1], q[2], q[3]) : new Quaternion();
}

export function toBodyPose(snapshot: PoseSnapshot): BodyPose {
  return Object.fromEntries(Object.entries(snapshot.rotations).map(([bone, q]) => [bone, new Quaternion(q[0], q[1], q[2], q[3])]));
}
