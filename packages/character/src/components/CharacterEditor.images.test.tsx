/**
 * @file CharacterEditor.images.test.tsx
 * @description Component tests for the character editor reference image lifecycle: session discard on cancel, deletion after save, storage-full errors and late file reads.
 * @scope cinelab-studio
 * @depends CharacterEditor.tsx, store, repository, presets, image-repository
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
