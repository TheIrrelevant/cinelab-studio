/**
 * @file StudioScreen.test.tsx
 * @description Tests the studio composed with the render contract's Scene JSON panel.
 * @scope cinelab-studio/web
 * @depends StudioScreen.tsx, @cinelab/character
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { characterRepository } from "@cinelab/character/repository";
import { createCharacter } from "@cinelab/character/schema";
import { BASE_MODELS } from "@cinelab/character/presets";
import { StudioScreen } from "./StudioScreen";

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

describe("Scene JSON panel", () => {
  const SCENE_KEY = "cinelab-studio-scene-v1";

  async function openPanel() {
    render(<StudioScreen />);
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
      cameras: [{ id: "camera-0", position: [0, 0, 2], homePosition: [0, 0, 2], rotation: [0, Math.PI, 0], headRotation: [0, 0, 0], height: 1.25, body: "proDslr", lens: "standardZoom", iso: 400, aperture: 2.8, shutterIndex: 12, focusDistance: 2.6, zoomMm: 50, filter: "neutral", previewVisible: true, framing: "halfBody" }],
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
