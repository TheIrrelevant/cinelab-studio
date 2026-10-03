---
type: specification
description: Provider-neutral render contract (SceneJSON, render request/result, status lifecycle, error model, render history).
last-updated: 2026-10-03
last-model: claude-opus-5-5
depends_on: [../src/lib/render/contract.ts, ../src/lib/render/scene-json.ts, ../src/lib/render/render-repository.ts]
---

# Render contract (Phase 6)

The studio describes a shot once, in physical terms, and every AI provider consumes that same description. Nothing in the contract names a provider; provider-specific translation belongs to the Phase 7 adapter layer.

## SceneJSON (`version: 1`)

Built by `buildSceneJson(scene, characters, { cameraId? })` from the saved studio scene. It returns `{ ok: false, issues }` instead of a partial scene when the character, camera or lights are missing. Units: metres and degrees.

| Section | Contents |
|---|---|
| `character` | id, name, base model, gender presentation, body preset, height, skin tone (id/label/hex), hair (style/label/colour), face reference image ids, notes |
| `outfit` | `items: []` until the clothing catalog (Phase 5) exists |
| `subject` | position, yaw, pose preset and label |
| `camera` | body, lens, focal length, aperture, ISO, shutter (label and seconds), focus distance, bokeh, filter, framing preset, 36 mm sensor and 16:9 aspect, vertical FOV, position, height, yaw/tilt/roll, distance from lens to subject |
| `lights[]` | role, continuous/flash, bare/softbox (cm), slider power and effective capture power, colour, colour temperature (flash is 5600 K), beam spread, position, height, aim, and placement relative to the subject (azimuth: 0 front, +90 subject's left, 180 behind; elevation; distance) |
| `backdrop` | seamless paper colour and hex |

Reference images are passed as ids; adapters resolve them to files or URLs.

## Render request

`buildRenderRequest(scene, { kind, seed?, id?, now? })` adds an id, timestamp, `kind` (`preview` 1024x576 or `final` 3840x2160), an optional seed and `sceneHash`: the SHA-256 of the canonical (key-sorted) scene JSON. Previews and finals of the same scene share the hash.

## Result, status and errors

- Status lifecycle: `queued -> running -> succeeded | failed | cancelled`; `queued` may also fail or be cancelled. Terminal states never change.
- A result records the provider id, model and parameters actually used, outputs (uri, size, mime type) and timestamps.
- Only `failed` results carry an error and only `succeeded` results carry outputs.
- Error codes: `invalid_request`, `provider_unavailable`, `rate_limited`, `content_rejected`, `timeout`, `internal`. Each error has an actionable message and a `retryable` flag derived from its code.

## Render history

`renderRepository` stores request/result pairs under `cinelab-studio:renders:v1`. `enqueue` records a request as queued, `update` enforces the lifecycle, `findBySceneHash` returns renders of an identical scene for comparison and re-rendering. Write failures raise `StorageWriteError`.

In the studio, **Scene JSON** in the header shows the request for the current scene (or what is missing) with copy and download.
