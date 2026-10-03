---
type: agent-guide
description: "@cinelab/render-contract - provider-neutral SceneJSON, render requests/results and history."
last-updated: 2026-10-03
depends_on: [../core/AGENTS.md, ../human/AGENTS.md, ../character/AGENTS.md, ../studio/AGENTS.md, ../../docs/render-contract.md]
---

# @cinelab/render-contract

The stable interface between the studio and AI providers. Nothing here names a provider.
Spec: `docs/render-contract.md`.

- **Public API:** `./components/SceneJsonPanel` (used by apps/web). Library modules
  (`contract.ts` barrel, `scene-json.ts`, `render-repository.ts`) are internal until an adapter needs them.
- **Depends on:** core, human, character, studio, react, zod.

| File | Purpose |
|---|---|
| `scene-json-schema.ts` | SceneJSON schema (character, outfit, subject, camera, lights, backdrop) |
| `render-request.ts`, `render-result.ts`, `render-status.ts`, `render-errors.ts` | Request/result schemas, lifecycle, error model |
| `contract.ts` | Barrel re-exporting the above |
| `scene-json.ts` | Builds SceneJSON from scene + character; canonical SHA-256 hash; request builder |
| `render-repository.ts` | localStorage render history with lifecycle-checked updates |
| `components/SceneJsonPanel.tsx` | Studio panel showing the current request |

**Tests:** `pnpm --filter @cinelab/render-contract test`
