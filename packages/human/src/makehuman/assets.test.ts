/**
 * @file assets.test.ts
 * @description Integrity checks for the vendored MakeHuman CC0 assets: license, provenance, base
 *   mesh size, adult-only target set, every target parses within mesh bounds, rig/weights shape.
 * @scope cinelab-studio
 * @depends ./target-file, ../../assets/makehuman
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { parseTarget } from "./target-file";

const ASSETS = resolve(__dirname, "../../assets/makehuman");
const MACRO = join(ASSETS, "targets/macrodetails");
const BASE_VERTICES = 19158;
const NEUTRAL = /^universal-(fe)?male-(child|young|old)-averagemuscle-averageweight\.target\.gz$/;
const read = (rel: string) => readFileSync(join(ASSETS, rel), "utf8");
const targets = (dir: string) => readdirSync(dir).filter((name) => name.endsWith(".target.gz"));

describe("vendored MakeHuman assets", () => {
  it("ships the CC0 license and provenance note", () => {
    expect(read("LICENSE.ASSETS.md")).toContain("CC0 1.0 Universal");
    expect(read("SOURCE.md")).toMatch(/commit `[0-9a-f]{40}`/);
  });

  it("has the hm08 base mesh with the expected vertex count", () => {
    const obj = read("3dobjs/base.obj");
    expect(obj).toContain("released as CC0");
    expect(obj.match(/^v /gm)).toHaveLength(BASE_VERTICES);
    expect(obj).toMatch(/^g body$/m);
  });

  it("contains adult macro targets only (child, young, old; no baby)", () => {
    const all = [MACRO, join(MACRO, "height"), join(MACRO, "proportions")].flatMap(targets);
    expect(all).toHaveLength(288);
    expect(all.some((name) => name.includes("baby"))).toBe(false);
    for (const ethnicity of ["african", "asian", "caucasian"]) {
      for (const age of ["child", "young", "old"]) {
        expect(existsSync(join(MACRO, `${ethnicity}-female-${age}.target.gz`))).toBe(true);
        expect(existsSync(join(MACRO, `${ethnicity}-male-${age}.target.gz`))).toBe(true);
      }
    }
  });

  it("parses every target with vertex indices inside the base mesh", () => {
    const dirs = [MACRO, join(MACRO, "height"), join(MACRO, "proportions")];
    for (const dir of dirs) {
      for (const name of targets(dir)) {
        const { indices } = parseTarget(gunzipSync(readFileSync(join(dir, name))).toString("utf8"));
        // Average muscle + average weight is the neutral body: MakeHuman ships these empty.
        if (NEUTRAL.test(name)) {
          expect(indices.length, name).toBe(0);
          continue;
        }
        expect(indices.length, name).toBeGreaterThan(0);
        expect(Math.max(...indices), name).toBeLessThan(BASE_VERTICES);
      }
    }
  }, 60_000);

  it("has a default rig whose weights cover the same bones", () => {
    const rig = JSON.parse(read("rigs/standard/rig.default.json")) as Record<string, { parent?: string }>;
    const weights = JSON.parse(read("rigs/standard/weights.default.json")) as { weights: Record<string, unknown> };
    const bones = Object.keys(rig);
    expect(bones.length).toBe(163);
    expect(Object.keys(weights.weights).sort()).toEqual([...bones].sort());
    for (const bone of bones) {
      const parent = rig[bone].parent;
      if (parent) expect(bones, `${bone} parent`).toContain(parent);
    }
  });

  it("keeps the macro parameter definitions", () => {
    const macro = JSON.parse(read("targets/macrodetails/macro.json")) as { macrotargets: Record<string, unknown> };
    expect(Object.keys(macro.macrotargets)).toEqual(expect.arrayContaining(["gender", "age", "muscle", "weight"]));
  });
});
