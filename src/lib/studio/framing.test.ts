/**
 * @file framing.test.ts
 * @description Tests camera framing placement and its lens/scene constraints.
 * @scope cinelab-studio
 * @depends ./framing, ./scene-storage
 */

import { describe, expect, it } from "vitest";
import { CAMERA_LENSES } from "./camera-lenses";
import { verticalFieldOfView } from "./camera-feed";
import { FRAMINGS, framingPlacement } from "./framing";
import { studioCameraSchema } from "./scene-storage";

const subject = { position: [1, 0, -1] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] };
const noOffset = () => 0;

describe("framingPlacement", () => {
  it("fits the preset frame height into the vertical field of view", () => {
    for (const id of ["portrait", "halfBody", "fullBody"] as const) {
      const placement = framingPlacement(id, subject, 1.72, 2.8, noOffset);
      const distance = Math.hypot(placement.position[0] - 1, placement.position[2] + 1);
      const visible = 2 * distance * Math.tan((verticalFieldOfView(placement.zoomMm) * Math.PI) / 360);
      expect(visible).toBeCloseTo(FRAMINGS[id].frameHeight, 1);
      expect(placement.focusDistance).toBeCloseTo(distance, 1);
    }
  });

  it("orders distances portrait < half body < full body and faces the subject", () => {
    const [portrait, half, full] = (["portrait", "halfBody", "fullBody"] as const).map((id) =>
      framingPlacement(id, subject, 1.72, 2.8, noOffset),
    );
    expect(portrait.position[2]).toBeGreaterThan(-1);
    expect(half.height).toBeLessThan(portrait.height);
    expect(full.height).toBeLessThan(half.height);
    // Rig forward (+z rotated by yaw) points back at the subject.
    expect(Math.sin(portrait.rotation[1])).toBeCloseTo(0);
    expect(Math.cos(portrait.rotation[1])).toBeCloseTo(-1);
  });

  it("adds the lens offset to the rig distance, not the focus distance", () => {
    const plain = framingPlacement("halfBody", subject, 1.72, 2.8, noOffset);
    const offset = framingPlacement("halfBody", subject, 1.72, 2.8, () => 0.4);
    expect(offset.position[2] - plain.position[2]).toBeCloseTo(0.4);
    expect(offset.focusDistance).toBe(plain.focusDistance);
  });

  it("scales with subject height and respects lens aperture limits", () => {
    const tall = framingPlacement("fullBody", subject, 1.9, 1.4, noOffset);
    const short = framingPlacement("fullBody", subject, 1.6, 1.4, noOffset);
    expect(tall.position[2]).toBeGreaterThan(short.position[2]);
    expect(tall.aperture).toBe(CAMERA_LENSES.standardZoom.maxAperture);
    expect(framingPlacement("portrait", subject, 1.72, 1.4, noOffset).aperture).toBe(1.4);
  });

  it("produces camera values the scene schema accepts", () => {
    for (const id of ["portrait", "halfBody", "fullBody"] as const) {
      const placement = framingPlacement(id, subject, 1.72, 2.8, () => 0.4);
      const result = studioCameraSchema.safeParse({
        id: "camera-0", body: "proDslr", iso: 400, shutterIndex: 12, filter: "neutral", previewVisible: true,
        ...placement,
      });
      expect(result.success).toBe(true);
    }
  });
});
