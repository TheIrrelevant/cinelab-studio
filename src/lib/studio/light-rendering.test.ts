/**
 * @file light-rendering.test.ts
 * @description Tests flash strobe render parameters and capture-time intensity swapping.
 * @scope cinelab-studio
 * @depends ./light-rendering
 */

import { Group, Mesh, SpotLight } from "three";
import { describe, expect, it } from "vitest";
import {
  CAPTURE_INTENSITY_KEY,
  FLASH_COLOR,
  FLASH_MODELING_RATIO,
  FLASH_PEAK_MULTIPLIER,
  applyCaptureIntensities,
  lightRenderParams,
} from "./light-rendering";
import type { StudioLight } from "./scene-storage";

const light: StudioLight = {
  id: "light-1",
  position: [0, 0, 0],
  homePosition: [0, 0, 0],
  rotation: [0, 0, 0],
  headRotation: [0, 0, 0],
  height: 2.4,
  lightType: "bare",
  modifier: "none",
  softboxWidth: 90,
  softboxHeight: 60,
  intensity: 100,
  spread: 0.62,
  color: "#ef5350",
  colorTemperature: null,
  role: null,
};

describe("lightRenderParams", () => {
  it("renders a bare light with its own color and equal viewport/capture output", () => {
    const params = lightRenderParams(light);
    expect(params.color).toBe("#ef5350");
    expect(params.intensity).toBe(100);
    expect(params.captureIntensity).toBe(100);
  });

  it("renders a flash as a daylight strobe: harder, narrower, brighter at capture", () => {
    const bare = lightRenderParams(light);
    const flash = lightRenderParams({ ...light, lightType: "flash" });
    expect(flash.color).toBe(FLASH_COLOR);
    expect(flash.angle).toBeLessThan(bare.angle);
    expect(flash.penumbra).toBeLessThan(bare.penumbra);
    expect(flash.captureIntensity).toBe(100 * FLASH_PEAK_MULTIPLIER);
    expect(flash.intensity).toBeCloseTo(100 * FLASH_PEAK_MULTIPLIER * FLASH_MODELING_RATIO);
    expect(flash.intensity).toBeLessThan(bare.intensity);
  });

  it("keeps a flash through a softbox soft", () => {
    const flash = lightRenderParams({ ...light, lightType: "flash", modifier: "softbox" });
    expect(flash.angle).toBeGreaterThanOrEqual(0.7);
    expect(flash.penumbra).toBeGreaterThan(0.5);
  });
});

describe("applyCaptureIntensities", () => {
  it("raises tagged lights for capture and restores them afterwards", () => {
    const root = new Group();
    const flash = new SpotLight("#ffffff", 37.5);
    flash.userData[CAPTURE_INTENSITY_KEY] = 250;
    const untagged = new SpotLight("#ffffff", 80);
    const mesh = new Mesh();
    mesh.userData[CAPTURE_INTENSITY_KEY] = 999;
    root.add(flash, untagged, mesh);

    const restore = applyCaptureIntensities(root);
    expect(flash.intensity).toBe(250);
    expect(untagged.intensity).toBe(80);
    expect("intensity" in mesh).toBe(false);

    restore();
    expect(flash.intensity).toBe(37.5);
  });
});
