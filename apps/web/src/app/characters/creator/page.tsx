/**
 * @file page.tsx (characters/creator)
 * @description Character creator route (plan 2.5): the MakeHuman body with the Body tab.
 *   Needs `pnpm human:build` output in public/human.
 * @scope cinelab-studio/web
 * @depends @cinelab/character/components/creator/CharacterCreator
 */

"use client";

import { CharacterCreator } from "@cinelab/character/components/creator/CharacterCreator";

export default function CharacterCreatorPage() {
  return <CharacterCreator />;
}
