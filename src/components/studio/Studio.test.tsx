/**
 * @file Studio.test.tsx
 * @description Component tests for the studio shell, toolbar availability, and light creation flow.
 * @scope cinelab-studio
 * @depends Studio.tsx
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LightSettingsPanel, Studio } from "./Studio";
import { CameraPreview, CameraSettingsPanel, type StudioCameraAsset } from "./StudioCamera";

vi.mock("@react-three/fiber", () => ({
  Canvas: () => <div data-testid="studio-canvas" />,
  useFrame: vi.fn(),
  useThree: vi.fn(),
}));

vi.mock("@react-three/drei", () => ({
  Html: () => null,
  OrbitControls: () => null,
  TransformControls: () => null,
}));

afterEach(() => vi.restoreAllMocks());

describe("Studio", () => {
  it("opens directly into the studio with the complete toolbar", async () => {
    render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Light" })).toBeEnabled());

    expect(screen.getByTestId("studio-canvas")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Studio tools" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Light" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Camera" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Model" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pose" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Object" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rotate" })).toBeDisabled();
  });

  it("adds a light from the toolbar", async () => {
    render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Light" })).toBeEnabled());

    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("0 lights · 0 cameras");
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("1 light · 0 cameras");
    expect(screen.getByRole("button", { name: "Move" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Move" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Rotate" }));
    expect(screen.getByRole("button", { name: "Rotate" })).toHaveAttribute("aria-pressed", "true");
  });

  it("adds a professional camera and opens its live preview", async () => {
    render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Light" })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    expect(screen.getByRole("region", { name: "Camera preview" })).toBeInTheDocument();
    expect(screen.getByText("ISO 400")).toBeInTheDocument();
    expect(screen.getByText("50 mm")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move" })).toBeEnabled();
  });

  it("restores studio assets after a page remount", async () => {
    const firstRender = render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Light" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    fireEvent.click(screen.getByRole("button", { name: "Camera" }));

    await waitFor(() =>
      expect(window.localStorage.getItem("cinelab-studio-scene-v1")).toContain("camera-0"),
    );
    firstRender.unmount();
    render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Light" })).toBeEnabled());

    await waitFor(() =>
      expect(screen.getByLabelText("Scene asset count")).toHaveTextContent(
        "1 light · 1 camera",
      ),
    );
  });
  it("blocks asset creation before saved data has loaded", async () => {
    render(<Studio />);
    expect(screen.getByRole("button", { name: "Camera" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("0 lights · 0 cameras");
    await waitFor(() => expect(screen.getByRole("button", { name: "Camera" })).toBeEnabled());
  });

  it("preserves malformed storage and tells the user edits are temporary", async () => {
    window.localStorage.setItem("cinelab-studio-scene-v1", "{broken");
    render(<Studio />);
    expect(await screen.findByRole("alert")).toHaveTextContent("existing save is preserved");
    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("0 lights · 1 camera");
    expect(window.localStorage.getItem("cinelab-studio-scene-v1")).toBe("{broken");
  });

  it("shows a notice when saving fails and preserves the last save", async () => {
    render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Camera" })).toBeEnabled());
    const prior = window.localStorage.getItem("cinelab-studio-scene-v1");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Scene could not be saved");
    expect(window.localStorage.getItem("cinelab-studio-scene-v1")).toBe(prior);
  });

  it("allows a temporary session when storage access is denied", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Denied", "SecurityError"); });
    render(<Studio />);
    expect(await screen.findByRole("alert")).toHaveTextContent("this session will not be saved");
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("1 light · 0 cameras");
  });

});

describe("LightSettingsPanel", () => {
  const light = {
    id: "light-1",
    position: [0, 0, 0] as [number, number, number],
    homePosition: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    headRotation: [0, 0, 0] as [number, number, number],
    height: 2.4,
    modifier: "none" as const,
    softboxWidth: 90,
    softboxHeight: 60,
    intensity: 95,
    spread: 0.62,
    color: "#fff0d2",
  };

  it("updates the modifier and light power", () => {
    const onChange = vi.fn();
    render(
      <LightSettingsPanel
        light={light}
        onChange={onChange}
        onClose={vi.fn()}
        onResetTransform={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Softbox" }));
    expect(onChange).toHaveBeenCalledWith({ modifier: "softbox" });

    fireEvent.change(screen.getByRole("slider", { name: "Light power" }), {
      target: { value: "140" },
    });
    expect(onChange).toHaveBeenCalledWith({ intensity: 140 });

    fireEvent.change(screen.getByRole("spinbutton", { name: "Head rotation X degrees" }), {
      target: { value: "35" },
    });
    expect(onChange).toHaveBeenCalledWith({ headRotation: [35, 0, 0] });

    fireEvent.change(screen.getByRole("spinbutton", { name: "Light stand height" }), {
      target: { value: "2.8" },
    });
    expect(onChange).toHaveBeenCalledWith({ height: 2.8 });

    fireEvent.change(screen.getByRole("spinbutton", { name: "Light stand height" }), {
      target: { value: "10" },
    });
    expect(onChange).toHaveBeenCalledWith({ height: 10 });
  });

  it("updates preset colors and closes", () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    const onResetTransform = vi.fn();
    render(
      <LightSettingsPanel
        light={light}
        onChange={onChange}
        onClose={onClose}
        onResetTransform={onResetTransform}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Default pose/ }));
    expect(onResetTransform).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Set light color #d8e8ff" }));
    expect(onChange).toHaveBeenCalledWith({ color: "#d8e8ff" });

    fireEvent.change(screen.getByRole("textbox", { name: "Light color hex code" }), {
      target: { value: "#12AB34" },
    });
    expect(onChange).toHaveBeenCalledWith({ color: "#12ab34" });

    fireEvent.change(screen.getByRole("spinbutton", { name: "R color channel" }), {
      target: { value: "128" },
    });
    expect(onChange).toHaveBeenCalledWith({ color: "#80f0d2" });

    fireEvent.click(screen.getByRole("button", { name: "Close light settings" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("adjusts softbox width and height without fixed presets", () => {
    const onChange = vi.fn();
    render(
      <LightSettingsPanel
        light={{ ...light, modifier: "softbox" }}
        onChange={onChange}
        onClose={vi.fn()}
        onResetTransform={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("slider", { name: "Softbox width" }), {
      target: { value: "125" },
    });
    expect(onChange).toHaveBeenCalledWith({ softboxWidth: 125 });

    fireEvent.change(screen.getByRole("spinbutton", { name: "Softbox height centimeters" }), {
      target: { value: "75" },
    });
    expect(onChange).toHaveBeenCalledWith({ softboxHeight: 75 });
  });
});

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
    bokeh: 50,
    filter: "neutral",
    previewVisible: true,
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
