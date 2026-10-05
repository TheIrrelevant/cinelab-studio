/**
 * @file bone-axes.ts
 * @description Debug overlay: a small RGB axes helper (X red, Y green, Z blue) on every bone,
 *   drawn on top of the mesh, to check rest frames and roll visually.
 * @scope cinelab-studio
 * @depends three
 */

import { AxesHelper, type Bone, type LineBasicMaterial } from "three";

/** Attaches axes to each bone; returns a function that removes them again. */
export function attachBoneAxes(bones: Bone[], size = 0.035): () => void {
  const helpers = bones.map((bone) => {
    const helper = new AxesHelper(size);
    const material = helper.material as LineBasicMaterial;
    material.depthTest = false;
    material.transparent = true;
    helper.renderOrder = 999;
    helper.name = `axes:${bone.name}`;
    bone.add(helper);
    return helper;
  });
  return () =>
    helpers.forEach((helper) => {
      helper.removeFromParent();
      helper.dispose();
    });
}
