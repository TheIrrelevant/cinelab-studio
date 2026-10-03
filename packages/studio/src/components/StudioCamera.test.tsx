/**
 * @file StudioCamera.test.tsx
 * @description Camera preview exposure controls and camera settings panel.
 * @scope cinelab-studio
 * @depends StudioCamera
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CameraPreview, CameraSettingsPanel, type StudioCameraAsset } from "./StudioCamera";

vi.mock("@react-three/fiber", () => ({
  Canvas: () => <div data-testid="studio-canvas" />,
  useFrame: vi.fn(),
  useThree: vi.fn(),
}));

vi.mock("@react-three/drei", () => ({
  Html: () => null,
  OrbitControls: () => null,
  RoundedBox: () => null,
  TransformControls: () => null,
}));

afterEach(() => vi.restoreAllMocks());

describe("Studio camera controls", () => {
  const camera: StudioCameraAsset = {
    id: "camera-1",
    position: [0, 0, 0],
    homePosition: [0, 0, 0],
    rotation: [0, 0, 0],
    headRotation: [0, 0, 0],
    height: 1.55,
    body: "proDslr",
    lens: "standardZoom",
    iso: 400,
    aperture: 2.8,
    shutterIndex: 12,
    focusDistance: 2,
    zoomMm: 50,
    filter: "neutral",
    previewVisible: true,
    framing: null,
  };

  it("updates exposure values from the live preview", () => {
    const onChange = vi.fn();
    render(<CameraPreview camera={camera} onChange={onChange} />);

    fireEvent.change(screen.getByRole("slider", { name: "F" }), {
      target: { value: "4" },
    });
    expect(onChange).toHaveBeenCalledWith({ aperture: 4 });
    fireEvent.change(screen.getByRole("slider", { name: "ISO" }), {
      target: { value: "4" },
    });
    expect(onChange).toHaveBeenCalledWith({ iso: 800 });
    fireEvent.change(screen.getByRole("slider", { name: "Shutter Speed" }), {
      target: { value: "13" },
    });
    expect(onChange).toHaveBeenCalledWith({ shutterIndex: 13 });
    fireEvent.change(screen.getByRole("slider", { name: "Focus Distance" }), {
      target: { value: "3.5" },
    });
    expect(onChange).toHaveBeenCalledWith({ focusDistance: 3.5 });
    fireEvent.change(screen.getByRole("slider", { name: "Zoom" }), {
      target: { value: "65" },
    });
    expect(onChange).toHaveBeenCalledWith({ zoomMm: 65 });
  });

  it("disables zoom for prime lenses", () => {
    render(
      <CameraPreview
        camera={{ ...camera, lens: "prime50", zoomMm: 50 }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("slider", { name: "Zoom" })).toBeDisabled();
  });

  it("updates camera hardware, angle, filter, and preview visibility", () => {
    const onChange = vi.fn();
    render(
      <CameraSettingsPanel
        camera={camera}
        onChange={onChange}
        onClose={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Camera lens model" }), {
      target: { value: "prime85" },
    });
    expect(onChange).toHaveBeenCalledWith({
      lens: "prime85",
      zoomMm: 85,
      aperture: 2.8,
      focusDistance: 2,
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Camera angle X degrees" }), {
      target: { value: "-20" },
    });
    expect(onChange).toHaveBeenCalledWith({ headRotation: [-20, 0, 0] });
    fireEvent.click(screen.getByRole("button", { name: "Warm camera filter" }));
    expect(onChange).toHaveBeenCalledWith({ filter: "warm" });
    fireEvent.click(screen.getByRole("button", { name: "Live preview" }));
    expect(onChange).toHaveBeenCalledWith({ previewVisible: false });
  });
});
