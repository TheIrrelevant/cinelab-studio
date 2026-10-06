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
  - `./components/CharacterEditor`, `./components/CharacterLibrary`, `./components/StoreHydration`
  - `./components/creator/CharacterCreator` - MakeHuman character creator (plan 2.5): 3D viewport + Body tab (gender, ethnicity presets, cm/kg, body types, regions); in memory until plan 2.9.
- **Depends on:** core, human, next, react, zod, zustand, three, @react-three/fiber, @react-three/drei (creator viewport).

| Area | Files |
|---|---|
| Data | `schema.ts`, `presets.ts`, `repository.ts`, `image-repository.ts` |
| State | `character-store.ts` |
| Editor | `components/CharacterEditor.tsx` (layout), `useCharacterDraft.ts` (draft, images, save/cancel), `character-draft.ts`, `editor-fields.tsx`, `editor-controls.tsx` |
| Creator | `creator/creator-model.ts` (state, locked cm/kg via `keepSize`), `creator/use-creator.ts`, `components/creator/CharacterCreator.tsx`, `BodyTab.tsx`, `SizeFields.tsx`, `RegionGroup.tsx`, `CreatorViewport.tsx` |
| Library | `components/CharacterLibrary.tsx`, `CharacterPreview.tsx`, `StoreHydration.tsx` |

Notes: reference images are deleted only after save; storage failures raise `StorageWriteError`.

**Tests:** `pnpm --filter @cinelab/character test`
