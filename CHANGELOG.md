---
type: changelog
category: release-notes
scope: cinelab-studio
description: Changelog for Cinelab Studio. Append before every commit.
last-updated: 2026-10-03T00:00:00Z
last-model: claude-opus-5-5
last-change: backdrop colours, key/fill/rim roles, colour temperature
---

# Changelog

All notable changes to Cinelab Studio are recorded here. Format mirrors
Keep a Changelog; dates are absolute.

## 2026-10-03 - Backdrop, light roles and colour temperature

### Added
- Selectable seamless backdrop: clicking the cyclorama selects it and shows a hotspot that opens white / gray / black paper settings. Stored as `backdrop.color` (older saves default to gray).
- Key / Fill / Rim lighting roles in the light settings panel. A role places the light around the subject (the placed character, or the default spot), aims it at face height and sets power, softbox and spread (`src/lib/studio/light-presets.ts`). Stored as `role`; the panel title shows it.
- Colour temperature slider (2000-10000 K) that sets the light colour from a black-body approximation. Stored as `colorTemperature`; picking a custom colour clears it. Disabled for flash (fixed 5600 K).

## 2026-10-03 - First milestone: characters in the studio

### Added
- Model tool opens a character picker; the picked character appears in the studio as a placeholder mannequin built from its body preset, gender presentation, skin tone, hair style and hair colour (`StudioModel.tsx`, `src/lib/studio/mannequin.ts`).
- The mannequin can be selected, moved on the floor (X/Z only), turned around its vertical axis, swapped for another character (placement kept) and deleted.
- Scene JSON stores the active character as `model: { characterId, position, rotation }`; older saves load with `model: null`, and models whose character was deleted are dropped on load.
- Studio header links to the character library; library cards have "Open in studio" (`/?character=<id>`, parameter cleared after load).

### Changed
- Character library back link now reads "Back to studio".
- `scripts/e2e-milestone.mjs` starts from the studio and verifies the full milestone (create, save, reopen, open in studio, reload) - 16/16 steps.

## 2026-10-03 - Character data integrity

### Fixed
- Removing a reference image and then cancelling no longer deletes the stored image; removed images are deleted only after the character is saved.
- Images uploaded during a cancelled editing session are discarded instead of left orphaned.
- Deleting a character also deletes its reference images.
- Storage write failures (quota exceeded, storage disabled) now raise `StorageWriteError` instead of being swallowed. The editor and library show "Storage is full or unavailable. Changes were not saved.", keep the current state, and do not navigate away.
- `imageRepository.clear()` tolerates unavailable storage.

### Added
- `imageRepository.deleteMany(ids)` for single-write bulk cleanup.

## 2026-10-03 - Studio lights, delete tool and cleanup

### Added
- Bare/Flash light type. Flash renders as a 5600K daylight strobe: harder, narrower beam, a dim modeling light in the viewport, and 2.5x peak output while the camera feed captures (`src/lib/studio/light-rendering.ts`).
- Delete tool for the selected light or camera, persisted across reloads.
- Draggable, keyboard-movable and minimizable camera preview window (`PreviewWindow.tsx`).
- Larger, more detailed DSLR rig model.

### Changed
- Light settings: "Light modifier" is now a "Softbox" with/without toggle that is independent of the light type.
- Switching a flash back to bare light restores the stored color; flash no longer overwrites it.
- `scripts/check-studio.mjs` defaults to `http://localhost:3000` (Next dev blocks `127.0.0.1` dev resources).

### Removed
- Retired Ready Player Me placeholder (`RpmCreator`) and unused RPM configuration; the avatar provider replacement remains an open product decision.

### Fixed
- Unit tests failed on Node 25+ because the native `localStorage` global shadowed jsdom's; Vitest workers now run with `--no-experimental-webstorage` where supported.

## 2026-09-07 - Studio camera and scene persistence

### Added
- Full-screen interactive photo studio with tripod lights, adjustable softboxes, DSLR cameras and lens controls.
- Repeatable browser/GPU verification with two depth-separated checkerboards, exposure and zoom pixel comparisons, and scene reload checks.
- Explicit unavailable state for the discontinued Ready Player Me creator, retaining its callback interface without opening the retired service.

### Fixed
- Render camera previews in linear HDR with explicit ACES tone mapping and sRGB output so ISO, aperture and shutter affect actual pixels.
- Calculate vertical field of view from the 36 mm sensor width and viewfinder aspect ratio.
- Replace uniform CSS blur with depth-aware thin-lens defocus; hide transform helpers from captured frames and restore render state.
- Validate versioned scene payloads, lens limits and unique IDs before loading or saving; restore asset counters and block edits until hydration.
- Preserve invalid or unavailable saves and show a visible notice when changes cannot be saved.
- Keep the toolbar inside narrow screens and place the mobile preview below the studio header.

## 2026-07-12 — Phase 1: Character Editor MVP

### Added
- Next.js 16 (App Router) + TypeScript + Tailwind 4 + Zustand 5 + Zod 4 scaffold.
- `Character` data model (`schema.ts`) with all 12 roadmap fields and zod
  validation; constrained preset catalogs (`presets.ts`) for base model,
  gender, body, skin tone, hair style; `#rrggbb` hair color validation.
- localStorage persistence via repository pattern (`repository.ts`) —
  `findAll/findById/create/update/delete/clear`, schema re-validation on read,
  corruption-tolerant (invalid entries skipped, non-JSON treated as empty),
  SSR-safe, returns copies (immutable).
- Reference image storage (`image-repository.ts`) keeping data URLs separate
  from character JSON; `faceReferenceImageIds` link to it.
- Zustand store (`character-store.ts`) — single source of truth (characters
  array), active character derived, factory + singleton, all mutations
  persisted via repository, immutable state updates, status/error model.
- Character editor UI: create (`/characters/new`) + edit (`/characters/[id]/edit`)
  routes; name (required, disables Save until set), base model preset, gender,
  body preset, skin tone swatches, hair style, hair color picker, reference
  image attach/remove, notes; live 2D preview panel; store-hydration guard to
  prevent draft races.
- Character library UI (`/characters`) — list with thumbnails, reopen to edit,
  delete, empty state.
- Vitest + Testing Library + jsdom test suite; Playwright e2e proof script
  (`scripts/e2e-milestone.mjs`).

### Verified
- Unit + component tests: 47/47 passing.
- Coverage: 89.24% statements / 92.07% lines (target 80%).
- `pnpm typecheck`, `pnpm lint`, `pnpm build` all green.
- E2e milestone proof: 11/11 steps (create named character → save → listed in
  library → persisted to localStorage → survives reload → reopened prefilled →
  edit round-trips). Screenshots captured under `screenshots/` (gitignored).

### Notes
- 3D studio shell is Phase 3; Phase 1 ships a 2D preview only. The first
  milestone (create → save → reopen) is complete and proven end-to-end.
- localStorage ~5MB quota is a known Phase 1 limitation; reference images will
  move to IndexedDB or backend in a later phase.