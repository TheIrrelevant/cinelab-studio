/**
 * @file pose-ik.ts
 * @description Keeps IK limbs consistent with the rest of the pose. After an edit, limbs in IK
 *   mode are re-solved to their targets (so moving the root or bending the spine leaves hands and
 *   feet where they are), except limbs whose own bones were edited: their target follows the new
 *   end effector position instead. The result is written into the editor as plain rotations.
 * @scope cinelab-studio
 * @depends three, ./body-pose, ./ik-solver, ./limbs, ./pose-editor, ./morph-manifest
 */

import { Vector3, type Bone, type Skeleton } from "three";
import { applyBodyPose } from "./body-pose";
import { solveTwoBone } from "./ik-solver";
import { LIMBS, limbBones, type LimbId } from "./limbs";
import type { MorphManifest } from "./morph-manifest";
import { setIkTarget, setRotations, toBodyPose, type PoseEditor } from "./pose-editor";

export type PoseRig = { skeleton: Skeleton; bones: MorphManifest["bones"] };

const boneMap = ({ skeleton, bones }: PoseRig) => new Map<string, Bone>(bones.map((spec, i) => [spec.name, skeleton.bones[i]]));

/** Applies the editor's pose to the skeleton and refreshes world matrices. */
export function applySnapshot(rig: PoseRig, editor: PoseEditor): Map<string, Bone> {
  applyBodyPose(rig.skeleton, rig.bones, toBodyPose(editor.current), editor.current.rootOffset);
  rig.skeleton.bones[0].updateWorldMatrix(true, true);
  return boneMap(rig);
}

/** World position of a limb's end effector in the editor's current pose. */
export function effectorPosition(rig: PoseRig, editor: PoseEditor, limb: LimbId): Vector3 {
  return applySnapshot(rig, editor).get(LIMBS[limb].end)!.getWorldPosition(new Vector3());
}

/** Re-solves IK limbs (no undo step; call after the edit that recorded one). */
export function settleIk(rig: PoseRig, editor: PoseEditor, changed: readonly string[] = []): PoseEditor {
  const limbs = Object.keys(editor.current.ik) as LimbId[];
  if (limbs.length === 0) return editor;
  let next = editor;
  let bones = applySnapshot(rig, next);
  for (const limb of limbs) {
    if (limbBones(limb).some((bone) => changed.includes(bone))) {
      next = setIkTarget(next, limb, bones.get(LIMBS[limb].end)!.getWorldPosition(new Vector3()), false);
      continue;
    }
    const [x, y, z] = next.current.ik[limb]!;
    next = setRotations(next, solveTwoBone(bones, LIMBS[limb], new Vector3(x, y, z)), false);
    bones = applySnapshot(rig, next);
  }
  return next;
}
