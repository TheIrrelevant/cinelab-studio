/**
 * @file use-creator-persistence.test.ts
 * @description Plan 2.9 creator save/load: the first save creates a character (data v2, v1 fields
 *   from the human), later saves update it, a deep-linked id loads the saved state into the creator,
 *   an unknown id is reported, and creator state <-> human round-trips.
 * @scope cinelab-studio
 * @depends ./use-creator-persistence, ./creator-model, ../character-store
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCharacterStore } from "../character-store";
import { humanFromState, initialCreatorState, stateFromHuman, type CreatorState } from "./creator-model";
import { useCreatorPersistence } from "./use-creator-persistence";

const edited = (): CreatorState => {
  const base = initialCreatorState();
  return {
    ...base,
    shape: { ...base.shape, cupSize: 0.8, modifiers: { "head/head-oval": 0.7 }, bodyType: { id: "curvy", intensity: 0.5 } },
    appearance: { ...base.appearance, hair: "braid01", hairColour: "#8a3b1f" },
    size: { heightCm: 168, massKg: 58.5 },
    pose: { jaw: [0.2, 0, 0, 0.98] },
    expression: { eyeBlinkLeft: 1, mouthSmileRight: 0.4 },
  };
};

beforeEach(() => {
  window.localStorage.clear();
  useCharacterStore.getState().reset();
});

describe("creator persistence (plan 2.9)", () => {
  it("round-trips creator state through the saved human", () => {
    const state = edited();
    expect(stateFromHuman(humanFromState(state))).toEqual({ ...state, note: null });
  });

  it("creates on the first save, updates afterwards, and loads by id", async () => {
    const state = edited();
    const { result } = renderHook(() => useCreatorPersistence(null, state, vi.fn()));
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.rename("Lena"));
    let id: string | null = null;
    act(() => {
      id = result.current.save();
    });
    expect(result.current.status).toBe("saved");
    act(() => {
      result.current.save();
    });
    const { characters } = useCharacterStore.getState();
    expect(characters).toHaveLength(1);
    expect(characters[0]).toMatchObject({ id, name: "Lena", version: 2, genderPresentation: "feminine", bodyPreset: "plus", hairColor: "#8a3b1f" });
    expect(characters[0].human).toEqual(humanFromState(state));

    useCharacterStore.getState().reset();
    const load = vi.fn();
    const opened = renderHook(() => useCreatorPersistence(id, initialCreatorState(), load));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    expect(load.mock.calls[0][0]).toEqual({ ...state, note: null });
    expect(opened.result.current.name).toBe("Lena");
  });

  it("reports an unknown id and saves a new character instead", async () => {
    const { result } = renderHook(() => useCreatorPersistence("gone", edited(), vi.fn()));
    await waitFor(() => expect(result.current.missing).toBe(true));
    act(() => {
      result.current.save();
    });
    expect(useCharacterStore.getState().characters).toHaveLength(1);
    expect(useCharacterStore.getState().characters[0].name).toBe("Untitled");
  });
});
