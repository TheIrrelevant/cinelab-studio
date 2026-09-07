---
type: verification
description: Camera rendering and persistence behavior, regression commands, and provider lifecycle decision.
last-updated: 2026-09-07
last-model: codex-gpt-6
depends_on: [../scripts/check-studio.mjs, ../src/lib/studio/camera-feed.ts, ../src/lib/studio/scene-storage.ts]
---

# Studio camera and persistence

The camera feed renders the actual scene through the selected DSLR pose and focal length. The previous implementation wrote directly to an offscreen target; ISO changes produced identical pixels because tone mapping is not applied to ordinary WebGL render targets. The replacement renders linear HDR first and applies exposure, ACES tone mapping and sRGB conversion explicitly. Vertical field of view uses the cropped sensor height derived from a 36 mm sensor width and the 16:9 preview.

Focus uses the scene depth texture and the thin-lens circle of confusion. Changing focus distance switches the sharp plane; stopping down reduces blur; Bokeh at zero disables defocus. This is a bounded real-time approximation (32 aperture samples, maximum 12 pixel blur radius), not a path-traced lens simulation. The feed remains 480 x 270 at up to 12 frames per second. Shutter and ISO affect exposure; motion blur and sensor noise are not simulated. Editor transform helpers are hidden during capture, and render targets and visibility are restored afterward.

Scene storage validates version 1, complete transforms, hardware limits, and unique IDs. Editing is disabled until the initial read completes. New IDs start beyond the highest restored ID. Corrupt or inaccessible storage is never removed or overwritten; the UI explicitly describes a temporary session. Save failures preserve the previous stored value and display a notice.

# Verification

- `pnpm test`: 97 tests pass in the current working tree, including existing character/RPM configuration tests.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.
- Start `pnpm dev --hostname 127.0.0.1 --port 3000`, then run `pnpm test:studio:browser`.
- The browser script uses installed Chrome by default. Set `PLAYWRIGHT_CHANNEL` to another installed Playwright channel or `STUDIO_URL` to another local app URL. It starts and closes a Vite GPU fixture server on port 3101 and uses isolated browser storage.
- Evidence is written under `screenshots/studio-verification/` (ignored by Git), including focus comparisons, 24/70 mm framing, a mobile capture, and `results.json` on success.
- The GPU fixture compares independent checkerboards at 2 and 5 metres. Sharpness moves from one board to the other as focus changes; renderer target and editor-helper visibility are also checked.
- App checks compare actual canvas pixels for ISO, shutter, aperture and zoom, then verify reload preservation, unique IDs, and corrupt-storage preservation.

# Ready Player Me

Ready Player Me discontinued its services on January 31, 2026: https://readyplayer.me/ and https://forum.readyplayer.me/t/an-important-update-from-ready-player-me/3706.

`RpmCreator` preserves the planned callback interface but renders an unavailable notice and a link to the existing character library. It does not embed the retired provider, subscribe to messages, or promise new avatar creation. Legacy iframe tests were replaced with provider-retirement checks. Existing character data and separate RPM configuration work are preserved. Selecting and implementing another avatar provider is a separate product task.

# References

- Three.js post-processing and explicit output conversion: https://threejs.org/manual/en/post-processing.html
- Three.js color management: https://threejs.org/manual/en/color-management.html
