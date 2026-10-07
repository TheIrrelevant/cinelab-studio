---
type: agent-guide
description: "@cinelab/character - character data, persistence, store and editor/library UI."
last-updated: 2026-10-06
depends_on: [../core/AGENTS.md, ../human/AGENTS.md]
---

# @cinelab/character

Everything about a saved character: schema, presets, localStorage repositories, the Zustand
store, and the library and editor screens.

- **Public API**
  - `./schema` (Character, createCharacter, updateCharacter), `./presets` (base models, skin, hair, body)
  - `./repository` (characterRepository), `./character-store` (useCharacterStore)
  - `./mannequin` - `mannequinSpec(character)`, maps a character to `@cinelab/human` proportions
  - `./components/CharacterLibrary`, `./components/StoreHydration` (the old form editor was removed 2026-10-07; the creator replaces it)
  - `./components/creator/CharacterCreator` - MakeHuman character creator (plan 2.5): 3D viewport + Body tab (gender, ethnicity presets, cm/kg, body types, regions) + Head tab (face shapes, 117 head controls, portrait camera) + Face tab (51 facial actions, plan 3.1); `characterId` / `onSaved` for save and load (plan 2.9).
  - `./human-schema` - `HumanSchema`, `Human`, `createHuman` (character data v2); `./legacy-mapping` - `humanFromLegacy`, `legacyFromHuman`.
- **Depends on:** core, human, next, react, zod, zustand, three, @react-three/fiber, @react-three/drei (creator viewport).

| Area | Files |
|---|---|
| Data | `schema.ts` (v2, migrates v1 on parse), `human-schema.ts`, `legacy-mapping.ts`, `presets.ts`, `repository.ts`, `image-repository.ts` |
| State | `character-store.ts` |
| Creator | `creator/creator-model.ts` (state, locked cm/kg via `keepSize`), `creator/use-creator.ts`, `creator/use-creator-persistence.ts` (save/load), `components/creator/CharacterCreator.tsx`, `BodyTab.tsx`, `HeadTab.tsx`, `SizeFields.tsx`, `RegionGroup.tsx`, `CreatorViewport.tsx` |
| Library | `components/CharacterLibrary.tsx`, `StoreHydration.tsx` |

Notes: reference images are deleted only after save; storage failures raise `StorageWriteError`.

**Tests:** `pnpm --filter @cinelab/character test`
