/**
 * @file pose-editor.test.ts
 * @description Plan 1.4 pose editor: selection rules, limits respected on every edit, numeric
 *   edits round-trip, undo restores the exact pose (drag = one step), redo, resets, presets.
 * @scope cinelab-studio
 * @depends ./pose-editor, ./pose-numeric, ./joint-limits, ./body-pose
 */

import { describe, expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { limitDemoPose } from "./body-pose";
import { jointLimit } from "./joint-limits";
import { degreesToDelta, deltaToDegrees } from "./pose-numeric";
import * as P from "./pose-editor";

const turn = (x: number, y: number, z: number, angle: number) => new Quaternion().setFromAxisAngle(new Vector3(x, y, z).normalize(), angle);

describe("selection", () => {
  it("selects one bone, Shift adds and removes, primary is the last", () => {
    let e = P.select(P.createPoseEditor(), "head");
    e = P.select(e, "spine03", true);
    expect(e.selection).toEqual(["head", "spine03"]);
    expect(P.primarySelection(e)).toBe("spine03");
    e = P.select(e, "head", true);
    expect(e.selection).toEqual(["spine03"]);
    expect(P.select(e, "jaw").selection).toEqual(["jaw"]);
    expect(P.select(e, null).selection).toEqual([]);
  });
});

describe("edits", () => {
  it("clamps every rotation to the joint limits", () => {
    const e = P.setRotation(P.createPoseEditor(), "lowerleg01.L", turn(1, 0, 0, -1.2));
    const { x } = deltaToDegrees(P.rotationOf(e, "lowerleg01.L"));
    expect(x).toBeCloseTo(jointLimit("lowerleg01.L")!.limit.x[0], 6);
  });

  it("round-trips numeric edits inside the limits", () => {
    for (const [bone, values] of [["upperarm01.L", { x: 35, y: -20, z: 60 }], ["neck02", { x: -12.5, y: 18, z: 7 }], ["wrist.R", { x: 40, y: 5, z: -10 }]] as const) {
      const e = P.setRotation(P.createPoseEditor(), bone, degreesToDelta(values));
      const back = deltaToDegrees(P.rotationOf(e, bone));
      expect(back.x).toBeCloseTo(values.x, 6);
      expect(back.y).toBeCloseTo(values.y, 6);
      expect(back.z).toBeCloseTo(values.z, 6);
    }
  });

  it("ignores edits that the limits clamp back to the current pose", () => {
    const e = P.createPoseEditor();
    // The elbow is a hinge: a pure Z swing clamps to the rest pose.
    expect(P.setRotation(e, "lowerarm01.L", turn(0, 0, 1, 0.5))).toBe(e);
  });

  it("drops identity rotations from the pose", () => {
    let e = P.setRotation(P.createPoseEditor(), "head", turn(1, 0, 0, 0.2));
    e = P.setRotation(e, "head", new Quaternion());
    expect(e.current.rotations).toEqual({});
  });
});

describe("history", () => {
  it("undo restores the exact previous pose and redo re-applies it", () => {
    let e = P.setRotation(P.createPoseEditor(), "head", turn(1, 0.3, 0, 0.3));
    const before = structuredClone(e.current);
    e = P.setRotation(e, "spine02", turn(0.2, 1, 0.1, 0.15));
    e = P.setRootOffset(e, new Vector3(0.1, 0, -0.2));
    const after = structuredClone(e.current);
    e = P.undo(P.undo(e));
    expect(e.current).toEqual(before);
    e = P.redo(P.redo(e));
    expect(e.current).toEqual(after);
    expect(P.redo(e)).toBe(e);
  });

  it("records a drag as one undo step", () => {
    let e = P.beginEdit(P.createPoseEditor());
    for (let i = 1; i <= 20; i += 1) e = P.setRotation(e, "upperarm01.L", turn(0, 0, 1, i * 0.05), false);
    expect(e.past).toHaveLength(1);
    expect(P.undo(e).current.rotations).toEqual({});
  });

  it("clears redo after a new edit", () => {
    let e = P.setRotation(P.createPoseEditor(), "head", turn(1, 0, 0, 0.2));
    e = P.undo(e);
    e = P.setRotation(e, "jaw", turn(1, 0, 0, 0.2));
    expect(e.future).toHaveLength(0);
  });
});

describe("resets and presets", () => {
  it("resets only the selection, or everything", () => {
    let e = P.setRotation(P.createPoseEditor(), "head", turn(1, 0, 0, 0.2));
    e = P.setRotation(e, "jaw", turn(1, 0, 0, 0.2));
    e = P.setRootOffset(e, new Vector3(0, 0.1, 0));
    e = P.resetSelected(P.select(e, "head"));
    expect(Object.keys(e.current.rotations)).toEqual(["jaw"]);
    expect(e.current.rootOffset).toEqual([0, 0.1, 0]);
    e = P.resetSelected(P.select(e, "root"));
    expect(e.current.rootOffset).toEqual([0, 0, 0]);
    e = P.resetAll(e);
    expect(e.current.rotations).toEqual({});
    expect(P.undo(e).current.rotations).toHaveProperty("jaw");
  });

  it("loads a preset as one clamped undo step", () => {
    const e = P.loadPose(P.createPoseEditor(), limitDemoPose());
    expect(Object.keys(e.current.rotations).length).toBeGreaterThan(20);
    expect(e.past).toHaveLength(1);
    expect(Object.keys(P.toBodyPose(e.current))).toEqual(Object.keys(e.current.rotations));
  });
});
