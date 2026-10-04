---
type: agent-guide
description: Entry point for agents and developers - package map, rules, commands.
last-updated: 2026-10-04
depends_on: [packages/*/AGENTS.md, apps/web/AGENTS.md, tools/check-structure.mjs]
---

# Cinelab Studio

Web-based virtual photo studio: build a character, pose it in a 3D studio with real
camera and light controls, then send a provider-neutral scene to AI rendering.

## Read this first
1. Find the package that owns your task in the map below and open its `AGENTS.md`.
2. Scan file metadata (`@file`, `@description`, `@depends`) before opening files.
3. Every file stays at or under **200 lines**; split by responsibility before it grows.

## Package map (dependencies point left)
```
core <- human <- character <- studio <- render-contract <- apps/web
```
| Package | Owns |
|---|---|
| `packages/core` | Shared primitives (storage errors) |
| `packages/human` | 3D human figure: MakeHuman body (assets, converter, morphing), mannequin, poses |
| `packages/character` | Character data, persistence, store, library and editor UI |
| `packages/studio` | Scene storage, cameras, lights, framing, studio UI |
| `packages/render-contract` | SceneJSON, render request/result, status, errors, history |
| `apps/web` | Next.js routes; composes packages (e.g. studio + Scene JSON panel) |

## Rules (enforced by `pnpm check:structure` and ESLint)
- Max 200 lines per source, test and script file.
- Metadata header with `@file`, `@description`, `@depends` on every code file (config files exempt).
- A package imports another only if it is listed in its `package.json` dependencies, and only
  modules listed in that package's `exports`. No path aliases; relative imports stay inside the package.
- No dependency cycles. If a lower package needs something from a higher one, invert it
  (props, callbacks) and let `apps/web` compose.
- English only in files. Update `CHANGELOG.md` before every commit.

## Commands
| Command | Does |
|---|---|
| `pnpm dev` | Next dev server (http://localhost:3000, not 127.0.0.1) |
| `pnpm check` | structure check + lint + typecheck + all tests |
| `pnpm test` / `pnpm --filter @cinelab/<pkg> test` | all / one package's tests |
| `pnpm test:studio:browser` | GPU and studio pixel checks (needs dev server) |
| `pnpm test:e2e` | first-milestone end-to-end flow (needs dev server) |
| `pnpm test:human:browser` | MakeHuman lab browser check + screenshots (needs dev server) |
| `pnpm build` | production build |
| `pnpm human:build` | MakeHuman assets -> `apps/web/public/human/` (GLB + morph pack) |

Docs: `docs/studio-verification.md`, `docs/render-contract.md`.
