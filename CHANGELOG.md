---
type: changelog
category: release-notes
scope: cinelab-studio
description: Changelog for Cinelab Studio. Append before every commit.
last-updated: 2026-09-07T00:00:00Z
last-model: codex-gpt-6
last-change: completed studio camera rendering and persistence repairs
---

# Changelog

All notable changes to Cinelab Studio are recorded here. Format mirrors
Keep a Changelog; dates are absolute.

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