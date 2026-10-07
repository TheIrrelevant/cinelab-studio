/**
 * @file page.tsx (characters/creator)
 * @description Character creator route (plan 2.5): the MakeHuman body with the Body and Head tabs.
 *   `?id=<character id>` opens a saved character (plan 2.9); after the first save the id is put into
 *   the URL so the page can be reloaded or shared. Needs `pnpm human:build` output in public/human.
 * @scope cinelab-studio/web
 * @depends next/navigation, @cinelab/character/components/creator/CharacterCreator
 */

"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CharacterCreator } from "@cinelab/character/components/creator/CharacterCreator";

function CreatorRoute() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  return (
    <CharacterCreator
      characterId={id}
      onSaved={(saved) => {
        if (saved !== id) router.replace(`/characters/creator?id=${encodeURIComponent(saved)}`);
      }}
    />
  );
}

export default function CharacterCreatorPage() {
  return (
    <Suspense fallback={null}>
      <CreatorRoute />
    </Suspense>
  );
}
