/**
 * @file macro.test.ts
 * @description Tests age mapping and macro target weighting (naming, partitions of unity,
 *   one-sided modifiers, adult clamp, ethnicity normalisation).
 * @scope cinelab-studio
 * @depends ./macro
 */

import { describe, expect, it } from "vitest";
import { ageToMacro, DEFAULT_BODY, macroTargetWeights, type BodyParams } from "./macro";

const sum = (weights: Map<string, number>, test: (name: string) => boolean) =>
  [...weights].filter(([name]) => test(name)).reduce((total, [, w]) => total + w, 0);
const isUniversal = (name: string) => name.startsWith("universal-");
const isEthnic = (name: string) => /^(african|asian|caucasian)-/.test(name);

describe("ageToMacro", () => {
  it("maps adult years onto the MakeHuman age scale and clamps to 18-90", () => {
    expect(ageToMacro(25)).toBe(0.5);
    expect(ageToMacro(90)).toBe(1);
    expect(ageToMacro(18)).toBeCloseTo(0.34375);
    expect(ageToMacro(5)).toBe(ageToMacro(18));
    expect(ageToMacro(120)).toBe(1);
  });
});

describe("macroTargetWeights", () => {
  it("gives the neutral 25-year-old exactly the young targets", () => {
    const weights = macroTargetWeights(DEFAULT_BODY);
    expect(weights.get("universal-female-young-averagemuscle-averageweight")).toBeCloseTo(0.5);
    expect(weights.get("universal-male-young-averagemuscle-averageweight")).toBeCloseTo(0.5);
    expect(weights.get("african-female-young")).toBeCloseTo(1 / 6);
    expect([...weights.keys()].some((name) => name.startsWith("height/") || name.startsWith("proportions/"))).toBe(false);
  });

  it("keeps universal and ethnic weights a partition of unity for any body", () => {
    const bodies: BodyParams[] = [
      { ...DEFAULT_BODY, gender: 0.2, ageYears: 19, muscle: 0.9, weight: 0.1 },
      { ...DEFAULT_BODY, gender: 1, ageYears: 70, muscle: 0.3, weight: 0.75, african: 1, asian: 0, caucasian: 0 },
    ];
    for (const body of bodies) {
      const weights = macroTargetWeights(body);
      expect(sum(weights, isUniversal)).toBeCloseTo(1);
      expect(sum(weights, isEthnic)).toBeCloseTo(1);
    }
  });

  it("never uses baby targets and uses child targets only below 25", () => {
    const young = macroTargetWeights({ ...DEFAULT_BODY, ageYears: 18 });
    expect([...young.keys()].some((name) => name.includes("baby"))).toBe(false);
    expect(young.get("universal-female-child-averagemuscle-averageweight")).toBeCloseTo(0.5 * 0.5);
    const older = macroTargetWeights({ ...DEFAULT_BODY, ageYears: 40 });
    expect([...older.keys()].some((name) => name.includes("child"))).toBe(false);
  });

  it("scales one-sided height and proportions by distance from 0.5", () => {
    const tall = macroTargetWeights({ ...DEFAULT_BODY, gender: 1, height: 1 });
    expect(tall.get("height/male-young-averagemuscle-averageweight-maxheight")).toBeCloseTo(1);
    const short = macroTargetWeights({ ...DEFAULT_BODY, gender: 0, height: 0.25 });
    expect(short.get("height/female-young-averagemuscle-averageweight-minheight")).toBeCloseTo(0.5);
    const ideal = macroTargetWeights({ ...DEFAULT_BODY, gender: 0, proportions: 1 });
    expect(ideal.get("proportions/female-young-averagemuscle-averageweight-idealproportions")).toBeCloseTo(1);
  });

  it("normalises ethnicity and falls back to an even mix when all are zero", () => {
    const doubled = macroTargetWeights({ ...DEFAULT_BODY, gender: 0, african: 2, asian: 0, caucasian: 2 });
    expect(doubled.get("african-female-young")).toBeCloseTo(0.5);
    expect(doubled.has("asian-female-young")).toBe(false);
    const none = macroTargetWeights({ ...DEFAULT_BODY, gender: 0, african: 0, asian: 0, caucasian: 0 });
    expect(none.get("asian-female-young")).toBeCloseTo(1 / 3);
  });
});
