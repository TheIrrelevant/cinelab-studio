/**
 * @file CharacterLibrary.test.tsx
 * @description Component tests for the character library. Covers Phase 1 ACs:
 *   view a list of saved characters, reopen a saved character to continue editing.
 *   Also covers the empty state and the "new character" entry point.
 * @scope cinelab-studio
 * @depends CharacterLibrary.tsx, store, repository, presets
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CharacterLibrary } from "@/components/character/CharacterLibrary";
import { useCharacterStore } from "@/store/character-store";
import { characterRepository } from "@/lib/character/repository";
import { BASE_MODELS } from "@/lib/character/presets";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: pushMock }),
}));

beforeEach(() => {
  window.localStorage.clear();
  pushMock.mockClear();
  useCharacterStore.getState().reset();
  useCharacterStore.getState().load();
  vi.stubGlobal("crypto", {
    ...crypto,
    randomUUID: () => "char-0001",
  });
});

describe("CharacterLibrary", () => {
  it("shows an empty state with a create button when there are no characters", () => {
    render(<CharacterLibrary />);
    expect(screen.getByText(/no characters yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new character/i })).toHaveAttribute(
      "href",
      "/characters/new",
    );
  });

  it("lists saved characters with their names", () => {
    useCharacterStore.getState().createNew({
      name: "Aria",
      baseModelId: BASE_MODELS[0].id,
    });
    vi.unstubAllGlobals();
    vi.stubGlobal("crypto", {
      ...crypto,
      randomUUID: () => "char-0002",
    });
    useCharacterStore.getState().createNew({
      name: "Leo",
      baseModelId: BASE_MODELS[1].id,
    });

    render(<CharacterLibrary />);
    expect(screen.getByText("Aria")).toBeInTheDocument();
    expect(screen.getByText("Leo")).toBeInTheDocument();
  });

  it("reopen link navigates to the edit route for a saved character", async () => {
    const user = userEvent.setup();
    const c = useCharacterStore.getState().createNew({
      name: "Aria",
      baseModelId: BASE_MODELS[0].id,
    });
    render(<CharacterLibrary />);
    const editLink = screen.getByRole("link", { name: /edit aria/i });
    expect(editLink).toHaveAttribute("href", `/characters/${c.id}/edit`);
    await user.click(editLink);
    expect(pushMock).not.toHaveBeenCalled(); // it's a Next <Link>, not a router.push
  });

  it("delete removes the character from the list and storage", async () => {
    const user = userEvent.setup();
    useCharacterStore.getState().createNew({
      name: "Aria",
      baseModelId: BASE_MODELS[0].id,
    });
    expect(characterRepository.findAll()).toHaveLength(1);
    render(<CharacterLibrary />);
    await user.click(screen.getByRole("button", { name: /delete aria/i }));
    expect(screen.queryByText("Aria")).not.toBeInTheDocument();
    expect(characterRepository.findAll()).toHaveLength(0);
  });
});
describe("CharacterLibrary delete failures", () => {
  it("shows an error and keeps the character when deletion cannot be saved", async () => {
    const user = userEvent.setup();
    useCharacterStore.getState().createNew({ name: "Aria", baseModelId: BASE_MODELS[0].id });
    render(<CharacterLibrary />);
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    try {
      await user.click(screen.getByRole("button", { name: "Delete Aria" }));
    } finally {
      setItem.mockRestore();
    }
    expect(screen.getByRole("alert")).toHaveTextContent(/storage is full/i);
    expect(screen.getByText("Aria")).toBeInTheDocument();
    expect(characterRepository.findAll()).toHaveLength(1);
  });
});
