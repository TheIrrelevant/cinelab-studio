/**
 * @file CharacterEditor.create.test.tsx
 * @description Component tests for the character editor in create mode: required name, base model presets, appearance changes reflected in the preview, save/cancel navigation.
 * @scope cinelab-studio
 * @depends CharacterEditor.tsx, store, repository, presets
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CharacterEditor } from "./CharacterEditor";
import { useCharacterStore } from "../character-store";
import { characterRepository } from "../repository";
import { BASE_MODELS } from "../presets";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: pushMock }),
}));

beforeEach(() => {
  window.localStorage.clear();
  pushMock.mockClear();
  // reset the singleton store between tests
  useCharacterStore.getState().reset();
  useCharacterStore.getState().load();
  vi.stubGlobal("crypto", {
    ...crypto,
    randomUUID: () => "char-0001",
  });
});

describe("CharacterEditor (create mode)", () => {
  it("renders a required name field and base model options", () => {
    render(<CharacterEditor mode="create" />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    BASE_MODELS.forEach((m) => {
      expect(screen.getByRole("radio", { name: new RegExp(m.label, "i") }))
        .toBeInTheDocument();
    });
  });

  it("disables save until a name is entered", async () => {
    const user = userEvent.setup();
    render(<CharacterEditor mode="create" />);
    const save = screen.getByRole("button", { name: /save/i });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText(/name/i), "Aria");
    expect(save).toBeEnabled();
  });

  it("creates and persists a character on save, then navigates", async () => {
    const user = userEvent.setup();
    render(<CharacterEditor mode="create" />);
    await user.type(screen.getByLabelText(/name/i), "Aria");
    await user.click(screen.getByRole("radio", { name: /Leo/i }));
    await user.click(screen.getByRole("button", { name: /save/i }));
    // persisted
    const all = characterRepository.findAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Aria");
    expect(all[0].baseModelId).toBe("base-leo");
    // navigated to the library
    expect(pushMock).toHaveBeenCalledWith("/characters");
  });

  it("changing appearance settings updates the preview without breaking it", async () => {
    const user = userEvent.setup();
    render(<CharacterEditor mode="create" />);
    await user.type(screen.getByLabelText(/name/i), "Aria");
    // change skin tone to Espresso
    await user.click(screen.getByRole("radio", { name: /Espresso/i }));
    const preview = screen.getByTestId("character-preview");
    expect(preview).toBeInTheDocument();
    // preview reflects the chosen skin tone label
    expect(within(preview).getByText(/Espresso/i)).toBeInTheDocument();
  });

  it("cancel navigates back to the library without saving", async () => {
    const user = userEvent.setup();
    render(<CharacterEditor mode="create" />);
    await user.type(screen.getByLabelText(/name/i), "Aria");
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(pushMock).toHaveBeenCalledWith("/characters");
    expect(characterRepository.findAll()).toHaveLength(0);
  });

  it("changing hair style and hair color updates the draft", async () => {
    const user = userEvent.setup();
    render(<CharacterEditor mode="create" />);
    await user.type(screen.getByLabelText(/name/i), "Aria");
    await user.click(screen.getByRole("radio", { name: /^Long$/i }));
    const colorEl = document.querySelector(
      'input[type="color"][aria-label="Hair color"]',
    ) as HTMLInputElement;
    fireEvent.change(colorEl, { target: { value: "#ff0000" } });
    // save succeeds with the new values
    await user.click(screen.getByRole("button", { name: /save/i }));
    const saved = characterRepository.findAll()[0];
    expect(saved.hairStyle).toBe("hair-long");
    expect(saved.hairColor).toBe("#ff0000");
  });

  it("attaches a reference image via file input and removes it", async () => {
    const user = userEvent.setup();
    render(<CharacterEditor mode="create" />);
    await user.type(screen.getByLabelText(/name/i), "Aria");
    const file = new File(["pixel"], "face.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(/reference images/i), file);
    // reference image thumbnail appears
    expect(await screen.findByAltText("reference")).toBeInTheDocument();
    // persisted image exists in the image store
    const { imageRepository } = await import("../image-repository");
    expect(imageRepository.list()).toHaveLength(1);
    // remove it
    await user.click(screen.getByRole("button", { name: /remove reference image/i }));
    expect(screen.queryByAltText("reference")).not.toBeInTheDocument();
  });
});
