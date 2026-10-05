/**
 * @file modifier-catalogue.test.ts
 * @description Plan 2.1 catalogue: built from the vendored target.json, 83 body and 117 head
 *   modifiers, excluded groups absent, left/right pairs complete, labels and end words readable,
 *   face shapes and the triangular chin unipolar, every referenced target file vendored.
 * @scope cinelab-studio
 * @depends ./modifier-catalogue, ../../assets/makehuman/targets
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ASSETS } from "../../scripts/build-assets.ts";
import { buildCatalogue, catalogueTargets, isBreastMacro, modifierLabel, type TargetJson } from "./modifier-catalogue";

const ROOT = join(ASSETS, "targets");
const json = JSON.parse(readFileSync(join(ROOT, "target.json"), "utf8")) as TargetJson;
const groups = Object.keys(json).filter((group) => existsSync(join(ROOT, group)));
const catalogue = buildCatalogue(json, groups);
const byId = (id: string) => catalogue.find((m) => m.id === id)!;

describe("modifier catalogue", () => {
  it("has 83 body and 117 head modifiers from the vendored groups only", () => {
    expect(catalogue.filter((m) => m.section === "body")).toHaveLength(83);
    expect(catalogue.filter((m) => m.section === "head")).toHaveLength(117);
    for (const excluded of ["asym", "expression", "genitals", "measure", "macrodetails"]) expect(groups).not.toContain(excluded);
    expect(new Set(catalogue.map((m) => m.id)).size).toBe(catalogue.length);
  });

  it("gives sided modifiers both sides on both ends and unsided ones a single target per end", () => {
    for (const m of catalogue.filter((x) => x.kind === "bipolar")) {
      for (const end of [m.negative, m.positive]) {
        if (m.sided) expect(Boolean(end.left && end.right && !end.unsided), m.id).toBe(true);
        else expect(Boolean(end.unsided && !end.left && !end.right), m.id).toBe(true);
      }
    }
  });

  it("makes the face shapes unipolar", () => {
    const unipolar = catalogue.filter((m) => m.kind === "unipolar");
    // Seven head shapes plus the triangular chin.
    expect(unipolar.map((m) => m.id).sort()).toContain("chin/chin-triangle");
    expect(unipolar).toHaveLength(8);
    expect(unipolar.every((m) => m.section === "head" && m.positive.unsided && !m.ends)).toBe(true);
    expect(byId("head/head-oval").label).toBe("Oval");
  });

  it("names modifiers and their ends readably", () => {
    expect(byId("eyes/eye-corner1-down-up")).toMatchObject({ label: "Corner 1", ends: ["down", "up"], sided: true });
    expect(byId("nose/nose-trans-down-up").ends).toEqual(["down", "up"]);
    expect(byId("torso/measure-underbust-circ-decr-incr").label).toBe("Underbust circ");
    expect(modifierLabel("mouth", "mouth-lowerlip-height")).toBe("Lowerlip height");
    expect(catalogue.every((m) => m.label.length > 0)).toBe(true);
  });

  it("references only vendored target files", () => {
    for (const name of catalogueTargets(catalogue)) expect(existsSync(join(ROOT, `${name}.target.gz`)), name).toBe(true);
  });

  it("recognises adult breast cup/firmness macros", () => {
    expect(isBreastMacro("female-young-averagemuscle-maxweight-maxcup-minfirmness")).toBe(true);
    expect(isBreastMacro("female-child-averagemuscle-averageweight-averagecup-maxfirmness")).toBe(false);
    expect(isBreastMacro("breast-dist-incr")).toBe(false);
  });
});
