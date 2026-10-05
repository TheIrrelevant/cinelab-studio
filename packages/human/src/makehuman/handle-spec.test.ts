/**
 * @file handle-spec.test.ts
 * @description Plan 1.3 handle data: every posable rig bone has exactly one handle, facial bones
 *   none; colours by side and per finger; IK effectors are triangles; finger toggle membership.
 * @scope cinelab-studio
 * @depends ./handle-spec, ./joint-limits, rig.default.json
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ASSETS } from "../../scripts/build-assets.ts";
import { fingerIndex, HANDLE_COLOURS, handleSpecs } from "./handle-spec";
import { jointLimit } from "./joint-limits";

const RIG = Object.keys(JSON.parse(readFileSync(join(ASSETS, "rigs/standard/rig.default.json"), "utf8")) as object);
const specs = handleSpecs(RIG);
const spec = (bone: string) => specs.find((s) => s.bone === bone)!;

describe("handleSpecs", () => {
  it("gives every posable bone exactly one handle and facial bones none", () => {
    const posable = RIG.filter((bone) => jointLimit(bone));
    expect(specs.map((s) => s.bone)).toEqual(posable);
    expect(new Set(specs.map((s) => s.bone)).size).toBe(specs.length);
    expect(specs.some((s) => /^(oris|levator|tongue|special)/.test(s.bone))).toBe(false);
  });

  it("colours the centre line white, right red and left blue", () => {
    expect(spec("spine03").color).toBe(HANDLE_COLOURS.centre);
    expect(spec("head").color).toBe(HANDLE_COLOURS.centre);
    expect(spec("lowerleg01.R").color).toBe(HANDLE_COLOURS.right);
    expect(spec("upperarm01.L").color).toBe(HANDLE_COLOURS.left);
    expect(spec("toe2-1.L").color).toBe(HANDLE_COLOURS.left);
  });

  it("gives each finger its own colour, metacarpals included, same on both hands", () => {
    for (let finger = 1; finger <= 5; finger += 1) {
      for (const side of ["L", "R"]) {
        expect(spec(`finger${finger}-2.${side}`).color).toBe(HANDLE_COLOURS.fingers[finger - 1]);
      }
    }
    expect(spec("metacarpal1.L").color).toBe(HANDLE_COLOURS.fingers[1]);
    expect(new Set(HANDLE_COLOURS.fingers).size).toBe(5);
    expect(fingerIndex("metacarpal4.R")).toBe(5);
    expect(fingerIndex("wrist.L")).toBe(0);
  });

  it("draws IK end effectors as triangles", () => {
    const triangles = specs.filter((s) => s.shape === "triangle").map((s) => s.bone).sort();
    expect(triangles).toEqual(["foot.L", "foot.R", "wrist.L", "wrist.R"]);
  });

  it("puts fingers, thumbs and metacarpals under the finger toggle, not wrists or toes", () => {
    expect(specs.filter((s) => s.finger)).toHaveLength(2 * (15 + 4));
    expect(spec("wrist.L").finger).toBe(false);
    expect(spec("toe1-1.R").finger).toBe(false);
  });

  it("sizes handles by joint group", () => {
    expect(spec("root").radius).toBeGreaterThan(spec("spine01").radius);
    expect(spec("finger3-3.L").radius).toBeLessThan(spec("wrist.L").radius);
    expect(spec("upperarm02.L").radius).toBeLessThan(spec("upperarm01.L").radius);
  });
});
