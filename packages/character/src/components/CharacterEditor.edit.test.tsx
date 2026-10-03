/**
 * @file CharacterEditor.edit.test.tsx
 * @description Component tests for the character editor in edit mode: prefill from a saved character, update on save, and fallback for a missing id.
 * @scope cinelab-studio
 * @depends CharacterEditor.tsx, store, repository, presets
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("CharacterEditor (edit mode)", () => {
  it("prefills the form from a saved character and updates it on save", async () => {
    const user = userEvent.setup();
    // seed a character
    const created = useCharacterStore.getState().createNew({
      name: "Aria",
      baseModelId: BASE_MODELS[0].id,
    });
    render(<CharacterEditor mode="edit" characterId={created.id} />);
    const name = screen.getByLabelText(/name/i);
    expect(name).toHaveValue("Aria");
    await user.clear(name);
    await user.type(name, "Aria II");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(characterRepository.findById(created.id)?.name).toBe("Aria II");
    expect(pushMock).toHaveBeenCalledWith("/characters");
  });

  it("falls back to empty draft when editing a missing character id", () => {
    render(<CharacterEditor mode="edit" characterId="does-not-exist" />);
    // no crash; save disabled because name is empty in the empty draft
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });
});
