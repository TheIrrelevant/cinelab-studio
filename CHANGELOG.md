---
type: changelog
category: release-notes
scope: cinelab-studio
description: Changelog for Cinelab Studio. Append before every commit.
last-updated: 2026-07-12T00:00:00Z
last-model: claude-glm-5.2
last-change: Phase 1 Character Editor MVP complete
---

# Changelog

All notable changes to Cinelab Studio are recorded here. Format mirrors
Keep a Changelog; dates are absolute.

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