---
type: agent-guide
description: "@cinelab/web - Next.js app that composes the Cinelab packages."
last-updated: 2026-10-03
depends_on: [../../AGENTS.md]
---

# @cinelab/web

Routes and composition only; feature code lives in `packages/*`.

| Route | File |
|---|---|
| `/` | `src/app/page.tsx` -> `StudioScreen.tsx` (Studio + Scene JSON panel) |
| `/characters` | `src/app/characters/page.tsx` (library) |
| `/characters/new`, `/characters/[id]/edit` | editor pages |

- `next.config.ts` transpiles the workspace packages; `globals.css` tells Tailwind to scan `packages/`.
- `scripts/check-studio.mjs` (GPU fixture + studio pixel checks) and `scripts/e2e-milestone.mjs`
  need `pnpm dev` running on http://localhost:3000.

**Tests:** `pnpm --filter @cinelab/web test`
