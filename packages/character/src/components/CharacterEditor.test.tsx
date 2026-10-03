/**
 * @file CharacterEditor.test.tsx
 * @description Component tests for the character editor. Covers the Phase 1 ACs:
 *   create with required name, select base model preset, change appearance without
 *   breaking the preview, save to persistent storage. Uses Testing Library + jsdom.
 * @scope cinelab-studio
 * @depends CharacterEditor.tsx, store, repository, presets
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CharacterEditor } from "./CharacterEditor";
import { useCharacterStore } from "../character-store";
import { characterRepository } from "../repository";
import { BASE_MODELS } from "../presets";
import { imageRepository } from "../image-repository";

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

describe("CharacterEditor reference image lifecycle", () => {
  let uuid = 0;
  beforeEach(() => {
    vi.stubGlobal("crypto", { ...crypto, randomUUID: () => `uuid-${++uuid}` });
  });

  function seedWithImage() {
    const imageId = imageRepository.save("data:image/png;base64,SAVED");
    const created = useCharacterStore.getState().createNew({
      name: "Aria",
      baseModelId: BASE_MODELS[0].id,
      faceReferenceImageIds: [imageId],
    });
    return { created, imageId };
  }

  it("keeps a saved image when its removal is cancelled", async () => {
    const user = userEvent.setup();
    const { created, imageId } = seedWithImage();
    render(<CharacterEditor mode="edit" characterId={created.id} />);
    await user.click(screen.getByRole("button", { name: /remove reference image/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(imageRepository.get(imageId)).toBe("data:image/png;base64,SAVED");
    expect(characterRepository.findById(created.id)?.faceReferenceImageIds).toEqual([imageId]);
  });

  it("deletes a removed saved image only after save", async () => {
    const user = userEvent.setup();
    const { created, imageId } = seedWithImage();
    render(<CharacterEditor mode="edit" characterId={created.id} />);
    await user.click(screen.getByRole("button", { name: /remove reference image/i }));
    expect(imageRepository.get(imageId)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(imageRepository.get(imageId)).toBeNull();
    expect(characterRepository.findById(created.id)?.faceReferenceImageIds).toEqual([]);
  });

  it("discards images uploaded in a cancelled session", async () => {
    const user = userEvent.setup();
    const { created, imageId } = seedWithImage();
    render(<CharacterEditor mode="edit" characterId={created.id} />);
    await user.upload(
      screen.getByLabelText(/reference images/i),
      new File(["pixel"], "face.png", { type: "image/png" }),
    );
    // File reading is async; wait until the new thumbnail is rendered.
    await waitFor(() => expect(screen.getAllByAltText("reference")).toHaveLength(2));
    expect(imageRepository.list()).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(imageRepository.list()).toEqual([imageId]);
  });

  it("discards an image uploaded and removed before saving", async () => {
    const user = userEvent.setup();
    render(<CharacterEditor mode="create" />);
    await user.type(screen.getByLabelText(/name/i), "Aria");
    await user.upload(
      screen.getByLabelText(/reference images/i),
      new File(["pixel"], "face.png", { type: "image/png" }),
    );
    await user.click(await screen.findByRole("button", { name: /remove reference image/i }));
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(imageRepository.list()).toEqual([]);
  });

  it("shows an error and stays on the page when storage is full", async () => {
    const user = userEvent.setup();
    render(<CharacterEditor mode="create" />);
    await user.type(screen.getByLabelText(/name/i), "Aria");
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    try {
      await user.upload(
        screen.getByLabelText(/reference images/i),
        new File(["pixel"], "face.png", { type: "image/png" }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(/storage is full/i);
      await user.click(screen.getByRole("button", { name: /save/i }));
    } finally {
      setItem.mockRestore();
    }
    expect(screen.getByRole("alert")).toHaveTextContent(/storage is full/i);
    expect(pushMock).not.toHaveBeenCalled();
    expect(characterRepository.findAll()).toEqual([]);
  });
});

describe("CharacterEditor late file reads", () => {
  it("does not store an image whose read finishes after cancel", async () => {
    let finishRead: (() => void) | undefined;
    const originalReadAsDataURL = FileReader.prototype.readAsDataURL;
    vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function (this: FileReader, blob: Blob) {
      finishRead = () => originalReadAsDataURL.call(this, blob);
    });
    const user = userEvent.setup();
    render(<CharacterEditor mode="create" />);
    await user.upload(
      screen.getByLabelText(/reference images/i),
      new File(["pixel"], "face.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    finishRead?.();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(imageRepository.list()).toEqual([]);
    vi.restoreAllMocks();
  });
});
