/**
 * @file Studio.test.tsx
 * @description Component tests for the studio shell, toolbar availability, and light creation flow.
 * @scope cinelab-studio
 * @depends Studio.tsx
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { StudioLight } from "@/lib/studio/scene-storage";
import { BackdropSettingsPanel, LightSettingsPanel, Studio } from "./Studio";
import { kelvinToHex } from "@/lib/studio/light-presets";
import { characterRepository } from "@/lib/character/repository";
import { createCharacter } from "@/lib/character/schema";
import { BASE_MODELS } from "@/lib/character/presets";
import { CameraPreview, CameraSettingsPanel, type StudioCameraAsset } from "./StudioCamera";
import { PosePickerPanel } from "./StudioModel";

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
    expect(screen.getByRole("button", { name: "Model" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Pose" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Object" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rotate" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("deletes only the selected light and keeps it deleted after reload", async () => {
    const view = render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Light" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("1 light · 1 camera");
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rotate" })).toBeDisabled();
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem("cinelab-studio-scene-v1")!);
      expect(saved.lights.map((light: { id: string }) => light.id)).toEqual(["light-0"]);
      expect(saved.cameras).toHaveLength(1);
    });
    view.unmount();
    render(<Studio />);
    await waitFor(() => expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("1 light · 1 camera"));
  });

  it("deletes a camera and closes its preview while preserving the light", async () => {
    render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Light" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.queryByRole("region", { name: "Camera preview" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("1 light · 0 cameras");
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem("cinelab-studio-scene-v1")!);
      expect(saved.cameras).toEqual([]);
      expect(saved.lights).toHaveLength(1);
    });
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
    lightType: "bare" as const,
    modifier: "none" as const,
    softboxWidth: 90,
    softboxHeight: 60,
    intensity: 95,
    spread: 0.62,
    color: "#fff0d2",
    colorTemperature: null,
    role: null,
  };

  it("locks flash to daylight, preserves softbox settings, and restores the bare color", () => {
    function Settings() {
      const [value, setValue] = useState<StudioLight>({ ...light, modifier: "softbox", color: "#ffb36b" });
      return <LightSettingsPanel light={value} onChange={(patch) => setValue((current) => ({ ...current, ...patch }))} onClose={vi.fn()} onResetTransform={vi.fn()} />;
    }
    render(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: "Flash" }));
    expect(screen.getByRole("button", { name: "Flash" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "With softbox" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("textbox", { name: "Light color hex code" })).toHaveValue("#FFEEE3");
    expect(screen.getByLabelText("Light color picker")).toBeDisabled();
    for (const [channel, value] of [["R", 255], ["G", 238], ["B", 227]] as const) {
      expect(screen.getByLabelText(`${channel} color channel`)).toBeDisabled();
      expect(screen.getByLabelText(`${channel} color channel`)).toHaveValue(value);
    }
    expect(screen.getByRole("button", { name: "Set light color #ef5350" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Light color hex code" }), { target: { value: "#ff0000" } });
    expect(screen.getByRole("textbox", { name: "Light color hex code" })).toHaveValue("#FFEEE3");
    fireEvent.click(screen.getByRole("button", { name: "Without softbox" }));
    expect(screen.queryByRole("slider", { name: "Softbox width" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bare Light" }));
    expect(screen.getByLabelText("Light color picker")).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "Light color hex code" })).toHaveValue("#FFB36B");
    fireEvent.click(screen.getByRole("button", { name: "Set light color #ef5350" }));
    expect(screen.getByRole("textbox", { name: "Light color hex code" })).toHaveValue("#EF5350");
    fireEvent.click(screen.getByRole("button", { name: "With softbox" }));
    expect(screen.getByRole("slider", { name: "Softbox width" })).toHaveValue("90");
  });

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

    fireEvent.click(screen.getByRole("button", { name: "With softbox" }));
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
    expect(onChange).toHaveBeenCalledWith({ color: "#d8e8ff", colorTemperature: null });

    fireEvent.change(screen.getByRole("textbox", { name: "Light color hex code" }), {
      target: { value: "#12AB34" },
    });
    expect(onChange).toHaveBeenCalledWith({ color: "#12ab34", colorTemperature: null });

    fireEvent.change(screen.getByRole("spinbutton", { name: "R color channel" }), {
      target: { value: "128" },
    });
    expect(onChange).toHaveBeenCalledWith({ color: "#80f0d2", colorTemperature: null });

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

describe("Studio character model", () => {
  const SCENE_KEY = "cinelab-studio-scene-v1";

  function seedCharacter(name: string) {
    return characterRepository.create(createCharacter({ name, baseModelId: BASE_MODELS[0].id }));
  }

  async function renderReady() {
    const view = render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Model" })).toBeEnabled());
    return view;
  }

  afterEach(() => window.history.replaceState(null, "", "/"));

  it("links to the character library and offers to create a character when none exist", async () => {
    await renderReady();
    expect(screen.getByRole("link", { name: "Characters" })).toHaveAttribute("href", "/characters");
    fireEvent.click(screen.getByRole("button", { name: "Model" }));
    expect(screen.getByRole("complementary", { name: "Choose a character" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create character" })).toHaveAttribute("href", "/characters/new");
  });

  it("places a picked character, persists it with the scene, and restores it", async () => {
    const aria = seedCharacter("Aria");
    const view = await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Model" }));
    fireEvent.click(screen.getByRole("button", { name: "Aria" }));
    expect(screen.queryByRole("complementary", { name: "Choose a character" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("0 lights · 0 cameras · Aria");
    expect(screen.getByRole("button", { name: "Move" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(SCENE_KEY)!);
      expect(saved.model).toEqual({ characterId: aria.id, position: [0, 0, -1], rotation: [0, 0, 0], pose: "standing" });
    });
    view.unmount();
    await renderReady();
    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("· Aria");
    fireEvent.click(screen.getByRole("button", { name: "Model" }));
    expect(screen.getByRole("button", { name: /Aria/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("deletes the selected model and removes it from the saved scene", async () => {
    seedCharacter("Aria");
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Model" }));
    fireEvent.click(screen.getByRole("button", { name: "Aria" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByLabelText("Scene asset count")).not.toHaveTextContent("Aria");
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(SCENE_KEY)!).model).toBeNull());
  });

  it("swaps the character but keeps the placement when another is picked", async () => {
    const aria = seedCharacter("Aria");
    const leo = seedCharacter("Leo");
    window.localStorage.setItem(SCENE_KEY, JSON.stringify({
      version: 1, lights: [], cameras: [],
      model: { characterId: aria.id, position: [2, 0, 1], rotation: [0, 1, 0] },
    }));
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Model" }));
    fireEvent.click(screen.getByRole("button", { name: "Leo" }));
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(SCENE_KEY)!);
      expect(saved.model).toEqual({ characterId: leo.id, position: [2, 0, 1], rotation: [0, 1, 0], pose: "standing" });
    });
  });

  it("opens the character named in the URL and clears the parameter", async () => {
    const aria = seedCharacter("Aria");
    window.history.replaceState(null, "", `/?character=${aria.id}`);
    await renderReady();
    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("· Aria");
    expect(window.location.search).toBe("");
  });

  it("drops a saved model whose character no longer exists", async () => {
    window.localStorage.setItem(SCENE_KEY, JSON.stringify({
      version: 1, lights: [], cameras: [],
      model: { characterId: "deleted", position: [0, 0, 0], rotation: [0, 0, 0] },
    }));
    await renderReady();
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(SCENE_KEY)!).model).toBeNull());
  });
});

describe("Light roles and colour temperature", () => {
  const base: StudioLight = {
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
    intensity: 95,
    spread: 0.62,
    color: "#fff0d2",
    colorTemperature: null,
    role: null,
  };

  it("sets colour and kelvin together from the temperature slider", () => {
    const onChange = vi.fn();
    render(<LightSettingsPanel light={base} onChange={onChange} onClose={vi.fn()} onResetTransform={vi.fn()} />);
    expect(screen.getByText("Custom")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Colour temperature"), { target: { value: "3200" } });
    expect(onChange).toHaveBeenCalledWith({ color: kelvinToHex(3200), colorTemperature: 3200 });
  });

  it("shows the role in the title and applies a role", () => {
    const onApplyRole = vi.fn();
    render(
      <LightSettingsPanel
        light={{ ...base, role: "fill", colorTemperature: 4300 }}
        onChange={vi.fn()}
        onClose={vi.fn()}
        onResetTransform={vi.fn()}
        onApplyRole={onApplyRole}
      />,
    );
    expect(screen.getByRole("heading", { name: "Fill light" })).toBeInTheDocument();
    expect(screen.getByText("4300 K")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fill" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Rim" }));
    expect(onApplyRole).toHaveBeenCalledWith("rim");
  });

  it("disables the temperature slider for flash", () => {
    render(<LightSettingsPanel light={{ ...base, lightType: "flash" }} onChange={vi.fn()} onClose={vi.fn()} onResetTransform={vi.fn()} />);
    expect(screen.getByLabelText("Colour temperature")).toBeDisabled();
    expect(screen.getByText("5600 K")).toBeInTheDocument();
  });

  it("restores older saves with no light role and the default gray backdrop", async () => {
    const aria = characterRepository.create(createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id }));
    window.localStorage.setItem("cinelab-studio-scene-v1", JSON.stringify({
      version: 1,
      lights: [{ ...base, id: "light-0" }],
      cameras: [],
      model: { characterId: aria.id, position: [2, 0, 0], rotation: [0, 0, 0] },
    }));
    render(<Studio />);
    await waitFor(() => expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("· Aria"));
    // Role application through the 3D hotspot is verified in the browser; Html is mocked here.
    const saved = () => JSON.parse(window.localStorage.getItem("cinelab-studio-scene-v1")!);
    expect(saved().lights[0].role).toBeNull();
    expect(saved().backdrop).toEqual({ color: "gray" });
  });
});

describe("BackdropSettingsPanel", () => {
  it("marks the current paper colour and changes it", () => {
    const onChange = vi.fn();
    render(<BackdropSettingsPanel backdrop={{ color: "gray" }} onChange={onChange} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /gray/i })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /white/i }));
    expect(onChange).toHaveBeenCalledWith({ color: "white" });
  });
});

describe("Pose and framing", () => {
  const SCENE_KEY = "cinelab-studio-scene-v1";

  async function renderWithModel() {
    const aria = characterRepository.create(createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id }));
    window.localStorage.setItem(SCENE_KEY, JSON.stringify({
      version: 1, lights: [], cameras: [],
      model: { characterId: aria.id, position: [0, 0, -1], rotation: [0, 0, 0] },
    }));
    render(<Studio />);
    await waitFor(() => expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("· Aria"));
  }

  it("keeps Pose disabled until a character is in the scene", async () => {
    render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Model" })).toBeEnabled());
    expect(screen.getByRole("button", { name: "Pose" })).toBeDisabled();
  });

  it("opens the pose picker and persists the chosen pose", async () => {
    await renderWithModel();
    fireEvent.click(screen.getByRole("button", { name: "Pose" }));
    const panel = screen.getByRole("complementary", { name: "Choose a pose" });
    expect(panel).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Standing" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Walking" }));
    expect(screen.getByRole("button", { name: "Walking" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(SCENE_KEY)!).model.pose).toBe("walking"));
  });

  it("closes the pose picker when the model is removed", async () => {
    await renderWithModel();
    fireEvent.click(screen.getByRole("button", { name: "Pose" }));
    fireEvent.click(screen.getByRole("button", { name: "Model" }));
    expect(screen.queryByRole("complementary", { name: "Choose a pose" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove from scene" }));
    expect(screen.getByRole("button", { name: "Pose" })).toBeDisabled();
  });

  it("renders pose choices for the panel contract", () => {
    const onPick = vi.fn();
    render(<PosePickerPanel pose="relaxed" characterName="Aria" onPick={onPick} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Relaxed" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Arms up" }));
    expect(onPick).toHaveBeenCalledWith("armsUp");
  });

  it("offers framing presets in the camera panel and marks the active one", () => {
    const onApplyFraming = vi.fn();
    const camera: StudioCameraAsset = {
      id: "camera-0", position: [0, 0, 0], homePosition: [0, 0, 0], rotation: [0, Math.PI, 0], headRotation: [0, 0, 0],
      height: 1.55, body: "proDslr", lens: "standardZoom", iso: 400, aperture: 2.8, shutterIndex: 12,
      focusDistance: 2, zoomMm: 50, bokeh: 50, filter: "neutral", previewVisible: true, framing: "halfBody",
    };
    render(<CameraSettingsPanel camera={camera} onChange={vi.fn()} onClose={vi.fn()} onReset={vi.fn()} onApplyFraming={onApplyFraming} />);
    expect(screen.getByRole("button", { name: "Half body" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Portrait" }));
    expect(onApplyFraming).toHaveBeenCalledWith("portrait");
  });
});

describe("Scene JSON panel", () => {
  const SCENE_KEY = "cinelab-studio-scene-v1";

  async function openPanel() {
    render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Scene JSON" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Scene JSON" }));
    return screen.getByRole("complementary", { name: "Scene JSON" });
  }

  it("lists what is missing before the scene can render", async () => {
    await openPanel();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Place a character in the studio (Model tool).");
    expect(status).toHaveTextContent("Add a camera to frame the shot.");
    expect(status).toHaveTextContent("Add at least one light.");
  });

  it("shows the provider-neutral request for a complete scene and copies it", async () => {
    const aria = characterRepository.create(createCharacter({ name: "Aria", baseModelId: BASE_MODELS[0].id }));
    window.localStorage.setItem(SCENE_KEY, JSON.stringify({
      version: 1,
      lights: [{ id: "light-0", position: [-1.8, 0, 0.6], homePosition: [-1.8, 0, 0.6], rotation: [0, 2.3, 0], headRotation: [25, 0, 0], height: 2.6, modifier: "softbox", softboxWidth: 120, softboxHeight: 90, intensity: 120, spread: 0.8, color: "#ffb87b", colorTemperature: 3200, role: "key" }],
      cameras: [{ id: "camera-0", position: [0, 0, 2], homePosition: [0, 0, 2], rotation: [0, Math.PI, 0], headRotation: [0, 0, 0], height: 1.25, body: "proDslr", lens: "standardZoom", iso: 400, aperture: 2.8, shutterIndex: 12, focusDistance: 2.6, zoomMm: 50, bokeh: 50, filter: "neutral", previewVisible: true, framing: "halfBody" }],
      model: { characterId: aria.id, position: [0, 0, -1], rotation: [0, 0, 0], pose: "walking" },
      backdrop: { color: "black" },
    }));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await openPanel();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/Ready · scene hash [0-9a-f]{12}/));
    const json = JSON.parse(screen.getByLabelText("Render request JSON").textContent!);
    expect(json.kind).toBe("preview");
    expect(json.scene.character.name).toBe("Aria");
    expect(json.scene.subject.pose.preset).toBe("walking");
    expect(json.scene.lights[0]).toMatchObject({ role: "key", colorTemperatureK: 3200 });
    expect(json.scene.backdrop.color).toBe("black");
    fireEvent.click(screen.getByRole("button", { name: "Copy JSON" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(JSON.parse(writeText.mock.calls[0][0]).sceneHash).toBe(json.sceneHash);
  });

  it("closes when another panel opens", async () => {
    await openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Model" }));
    expect(screen.queryByRole("complementary", { name: "Scene JSON" })).not.toBeInTheDocument();
  });
});
