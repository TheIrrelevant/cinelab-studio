/**
 * @file Studio.pose.test.tsx
 * @description Pose picker and camera framing presets.
 * @scope cinelab-studio
 * @depends Studio, StudioCamera, StudioModel, presets, repository, schema
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Studio } from "./Studio";
import { characterRepository } from "@cinelab/character/repository";
import { createCharacter } from "@cinelab/character/schema";
import { BASE_MODELS } from "@cinelab/character/presets";
import { CameraSettingsPanel, type StudioCameraAsset } from "./StudioCamera";
import { PosePickerPanel } from "./StudioModel";

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
      focusDistance: 2, zoomMm: 50, filter: "neutral", previewVisible: true, framing: "halfBody",
    };
    render(<CameraSettingsPanel camera={camera} onChange={vi.fn()} onClose={vi.fn()} onReset={vi.fn()} onApplyFraming={onApplyFraming} />);
    expect(screen.getByRole("button", { name: "Half body" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Portrait" }));
    expect(onApplyFraming).toHaveBeenCalledWith("portrait");
  });
});
