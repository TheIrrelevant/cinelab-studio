/**
 * @file Studio.model.test.tsx
 * @description Placing, persisting, swapping and deleting the character model in the studio.
 * @scope cinelab-studio
 * @depends Studio, presets, repository, schema
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Studio } from "./Studio";
import { characterRepository } from "@cinelab/character/repository";
import { createCharacter } from "@cinelab/character/schema";
import { BASE_MODELS } from "@cinelab/character/presets";

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

describe("Studio scene defaults", () => {
  const base = {
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
