---
type: agent-guide
description: "@cinelab/core - shared primitives with no internal dependencies."
last-updated: 2026-10-03
depends_on: []
---

# @cinelab/core

Shared building blocks every other package may use. Keep it tiny and dependency-free.

- **Public API:** `./storage-error` - `StorageWriteError`, raised when a write cannot be persisted.
- **Depends on:** nothing.
- **Tests:** `pnpm --filter @cinelab/core test`
