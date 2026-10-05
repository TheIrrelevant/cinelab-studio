/**
 * @file joint-limits.test.ts
 * @description Plan 1.2: the limit table covers every posable bone of the rig and nothing else,
 *   right bones mirror left ones, and per joint group clamped poses never exceed the limits while
 *   poses inside the limits stay unchanged.
 * @scope cinelab-studio
 * @depends ./joint-limits, ./swing-twist, rig.default.json
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { ASSETS } from "../../scripts/build-assets.ts";
import { clampBoneDelta, jointLimit, type JointGroup, type JointLimit } from "./joint-limits";
import { fromSwingTwist, toSwingTwist } from "./swing-twist";

const RIG = Object.keys(JSON.parse(readFileSync(join(ASSETS, "rigs/standard/rig.default.json"), "utf8")) as object);
const NOT_POSABLE = /^(levator|oculi|orbicularis|oris|risorius|temporalis|special|tongue|breast|pelvis)/;
const DEG = Math.PI / 180;
const EPS = 1e-6;

const posable = RIG.filter((name) => !NOT_POSABLE.test(name));
const byGroup = new Map<JointGroup, string[]>();
for (const name of posable) {
  const group = jointLimit(name)?.group;
  if (group) byGroup.set(group, [...(byGroup.get(group) ?? []), name]);
}

function within(limit: JointLimit, q: Quaternion) {
  const { swingX, swingZ, twist } = toSwingTwist(q);
  const inside = (value: number, [min, max]: readonly [number, number]) => value >= min * DEG - EPS && value <= max * DEG + EPS;
  return inside(swingX, limit.x) && inside(swingZ, limit.z) && inside(twist, limit.y);
}

/** Deterministic spread of rotations up to 180 degrees around varied axes. */
const rotations = Array.from({ length: 400 }, (_, i) =>
  new Quaternion().setFromAxisAngle(new Vector3(Math.sin(i * 1.7), Math.cos(i * 0.61), Math.sin(i * 2.3 + 1)).normalize(), ((i * 37) % 180) * DEG),
);

describe("joint limit table", () => {
  it("covers every posable bone and no facial, breast or pelvis bone", () => {
    expect(posable.length).toBeGreaterThan(90);
    for (const name of posable) expect(jointLimit(name), name).toBeDefined();
    for (const name of RIG.filter((n) => NOT_POSABLE.test(n))) expect(jointLimit(name), name).toBeUndefined();
  });

  it("mirrors right bones: X kept, Y and Z negated", () => {
    for (const name of posable.filter((n) => n.endsWith(".L"))) {
      const left = jointLimit(name)!.limit;
      const right = jointLimit(name.replace(/\.L$/, ".R"))!.limit;
      expect(right.x).toEqual(left.x);
      expect(right.y).toEqual([-left.y[1], -left.y[0]]);
      expect(right.z).toEqual([-left.z[1], -left.z[0]]);
    }
  });

  it("keeps every range around the rest pose", () => {
    for (const name of posable) {
      const { x, y, z } = jointLimit(name)!.limit;
      for (const [min, max] of [x, y, z]) expect(min <= 0 && max >= 0, name).toBe(true);
    }
  });

  it("makes elbows and knees hinges", () => {
    for (const name of [...byGroup.get("elbow")!, ...byGroup.get("knee")!]) expect(jointLimit(name)!.limit.z.map(Math.abs)).toEqual([0, 0]);
  });
});

describe("clampBoneDelta per joint group", () => {
  for (const group of ["root", "spine", "neck", "head", "jaw", "eye", "shoulder", "arm", "elbow", "wrist", "hand", "thumb", "finger", "hip", "knee", "ankle", "toe"] as const) {
    it(`${group}: clamped poses stay inside the limits`, () => {
      const names = byGroup.get(group) ?? [];
      expect(names.length, group).toBeGreaterThan(0);
      for (const name of names) {
        const { limit } = jointLimit(name)!;
        for (const q of rotations) expect(within(limit, clampBoneDelta(name, q)), name).toBe(true);
      }
    });
  }

  it("leaves poses inside the limits unchanged", () => {
    for (const name of posable) {
      const { x, y, z } = jointLimit(name)!.limit;
      const inside = fromSwingTwist({ swingX: ((x[0] + x[1]) / 4) * DEG, swingZ: ((z[0] + z[1]) / 4) * DEG, twist: ((y[0] + y[1]) / 4) * DEG });
      expect(clampBoneDelta(name, inside).angleTo(inside), name).toBeLessThan(1e-6);
    }
  });

  it("passes non-posable bones through", () => {
    const q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 1);
    expect(clampBoneDelta("oris01", q).angleTo(q)).toBe(0);
  });
});
