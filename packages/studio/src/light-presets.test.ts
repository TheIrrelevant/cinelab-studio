/**
 * @file light-presets.test.ts
 * @description Tests colour temperature conversion and key/fill/rim placement.
 * @scope cinelab-studio
 * @depends ./light-presets
 */

import { describe, expect, it } from "vitest";
import { Euler, Vector3 } from "three";
import { kelvinToHex, lightRolePlacement, SUBJECT_AIM_HEIGHT } from "./light-presets";

function aimDirection(placement: ReturnType<typeof lightRolePlacement>) {
  // Head points along local +z, pitched by headRotation X inside the yawed tripod group.
  const head = new Vector3(0, 0, 1).applyEuler(new Euler((placement.headRotation[0] * Math.PI) / 180, 0, 0));
  return head.applyEuler(new Euler(...placement.rotation));
}

describe("kelvinToHex", () => {
  it("is warm at tungsten, near white at daylight and blue when cool", () => {
    expect(kelvinToHex(3200)).toMatch(/^#ff[0-9a-f]{4}$/);
    const [r, , b] = [1, 3, 5].map((i) => Number.parseInt(kelvinToHex(3200).slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(b + 60);
    expect(kelvinToHex(6600)).toBe("#ffffff");
    const cool = kelvinToHex(10000);
    expect(Number.parseInt(cool.slice(5, 7), 16)).toBeGreaterThan(Number.parseInt(cool.slice(1, 3), 16));
  });

  it("clamps out-of-range values", () => {
    expect(kelvinToHex(500)).toBe(kelvinToHex(2000));
    expect(kelvinToHex(40000)).toBe(kelvinToHex(10000));
  });
});

describe("lightRolePlacement", () => {
  const subject = { position: [1, 0, -1] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] };

  it("aims every role at the subject's face", () => {
    for (const role of ["key", "fill", "rim"] as const) {
      const placement = lightRolePlacement(role, subject);
      const head = new Vector3(placement.position[0], placement.height, placement.position[2]);
      const toFace = new Vector3(subject.position[0], SUBJECT_AIM_HEIGHT, subject.position[2]).sub(head).normalize();
      expect(aimDirection(placement).dot(toFace)).toBeGreaterThan(0.999);
    }
  });

  it("puts key and fill in front on opposite sides, rim behind, fill weakest", () => {
    const key = lightRolePlacement("key", subject);
    const fill = lightRolePlacement("fill", subject);
    const rim = lightRolePlacement("rim", subject);
    expect(key.position[2]).toBeGreaterThan(subject.position[2]);
    expect(fill.position[2]).toBeGreaterThan(subject.position[2]);
    expect(rim.position[2]).toBeLessThan(subject.position[2]);
    expect(Math.sign(key.position[0] - 1)).toBe(-Math.sign(fill.position[0] - 1));
    expect(fill.intensity).toBeLessThan(key.intensity);
    expect(key.role).toBe("key");
    expect(key.homePosition).toEqual(key.position);
  });

  it("follows the subject's facing direction", () => {
    const turned = lightRolePlacement("key", { position: [0, 0, 0], rotation: [0, Math.PI, 0] });
    expect(turned.position[2]).toBeLessThan(0);
  });
});
