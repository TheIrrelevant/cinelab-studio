/**
 * @file StoreHydration.tsx
 * @description Client-only effect that loads persisted characters into the Zustand
 *   store on mount. Keeps SSR safe (localStorage is only read in the browser).
 *   Renders nothing; used to wrap client pages that depend on the store.
 * @scope cinelab-studio
 * @depends character-store.ts
 */

"use client";

import { useEffect } from "react";
import { useCharacterStore } from "@/store/character-store";

export function StoreHydration() {
  useEffect(() => {
    useCharacterStore.getState().load();
  }, []);
  return null;
}