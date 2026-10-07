/**
 * @file use-creator-persistence.ts
 * @description Save and load for the character creator (plan 2.9). Loads the character store, puts
 *   the character named by `characterId` (deep link `/characters/creator?id=...`) into the creator
 *   once, and saves the creator state as character data v2: a new character on the first save, an
 *   update afterwards. The v1 fields follow the human (`legacyFromHuman`).
 * @scope cinelab-studio
 * @depends react, ../character-store, ../legacy-mapping, ./creator-model
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useCharacterStore } from "../character-store";
import { legacyFromHuman } from "../legacy-mapping";
import { humanFromState, stateFromHuman, type CreatorState } from "./creator-model";

export type SaveStatus = "idle" | "saved" | "error";

export function useCreatorPersistence(characterId: string | null, state: CreatorState, load: (state: CreatorState) => void) {
  const storeStatus = useCharacterStore((s) => s.status);
  const loadStore = useCharacterStore((s) => s.load);
  // After the first save the creator keeps editing that character, even before the URL changes.
  const [savedId, setSavedId] = useState<string | null>(null);
  const id = savedId ?? characterId;
  const character = useCharacterStore((s) => (id ? (s.characters.find((c) => c.id === id) ?? null) : null));
  const [name, setName] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef<string | null>(null);

  useEffect(() => {
    if (storeStatus === "idle") loadStore();
  }, [storeStatus, loadStore]);

  useEffect(() => {
    if (!character || loaded.current === character.id) return;
    loaded.current = character.id;
    setName(character.name);
    load(stateFromHuman(character.human));
  }, [character, load]);

  // Any edit after a save makes the saved badge stale.
  const [savedState, setSavedState] = useState<CreatorState | null>(null);
  const edited = savedState !== null && (savedState.shape !== state.shape || savedState.appearance !== state.appearance || savedState.size !== state.size);

  const missing = Boolean(characterId) && storeStatus === "ready" && !character;

  /** Returns the saved character id, or null when saving failed. */
  function save(): string | null {
    const store = useCharacterStore.getState();
    try {
      const human = humanFromState(state);
      const trimmed = name.trim() || "Untitled";
      const saved = character
        ? store.updateCharacter(character.id, { name: trimmed, human, ...legacyFromHuman(human, character) })
        : store.createNew({ name: trimmed, human, ...legacyFromHuman(human) });
      if (!saved) throw new Error("Character no longer exists");
      loaded.current = saved.id;
      setSavedId(saved.id);
      setSavedState(state);
      setName(saved.name);
      setStatus("saved");
      setError(null);
      return saved.id;
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Saving failed");
      return null;
    }
  }

  const rename = (value: string) => {
    setName(value);
    setStatus("idle");
  };

  return { name, rename, save, status: status === "saved" && edited ? "idle" : status, error, missing, ready: storeStatus === "ready" };
}
