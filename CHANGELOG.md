---
type: changelog
category: release-notes
scope: cinelab-studio
description: Changelog for Cinelab Studio. Append before every commit.
last-updated: 2026-10-04T00:00:00Z
last-model: claude-opus-5-5
last-change: human creator plan
---

# Changelog

All notable changes to Cinelab Studio are recorded here. Format mirrors
Keep a Changelog; dates are absolute.

## 2026-10-04 - Human creator plan

### Added
- `docs/human-creator-plan.md`: phased plan (skeleton and gizmo foundation, detailed body and face creation, expressions and hands, studio integration) with acceptance criteria, source licenses (MakeHuman CC0, Anny Apache 2.0 as reference, AGPL sources excluded) and open decisions.

## 2026-10-04 - Skin, eyes and hair

### Added
- `Appearance` (skin tone, eye colour, hairstyle, hair colour, eyebrows, eyelashes) for `MakeHumanBody`. The skin texture blends the six young skins on a canvas with the same ethnicity and gender weights as the body shape; tone scales it darker or lighter.
- Proxies (eyes, hair, eyebrows, eyelashes) are created on demand as SkinnedMeshes sharing the body skeleton and re-fitted on every shape change (`body-controller.ts`, `proxy-data.ts`, `materials.ts`).
- Hair and eyebrows are tinted at runtime: seven hair colour presets plus a colour picker; eyebrows follow the hair colour, darker.
- `/lab/human`: appearance panel and Full body / Portrait camera views.
- Tests: skin blend weights, tone, catalog, hair fitted and skinned on a re-shaped body. Browser check: appearance changes measured on canvas pixels, three portraits.

### Changed
- Vendored hair textures are greyscale normalised to one brightness so every colour tints evenly; eyebrow textures are white with the shape in alpha.
- `check-human.mjs` compares canvas pixels instead of PNG bytes (PNG bytes made any change look like a large one) and asserts a stable render first.

## 2026-10-04 - Proxy pack

### Added
- Converter packs 27 proxies (eyes, 12 eyebrows, 4 eyelashes, 10 hairstyles) into `makehuman-proxies.bin/.json`: .mhclo fitting in source-vertex space, UV-split meshes and skin weights blended from the referenced body vertices; textures copied to `public/human/`.
- `makehuman/proxy-fit.ts` (fitting shared with the runtime), `convert/mhclo.ts`, `convert/proxy-pack.ts`, `scripts/system-inputs.ts`.
- Tests: mhclo parsing, fitting maths, eyes fit their authored mesh, every hairstyle sits on the head, proxy skin weights are normalised.

### Changed
- The morph pack also carries the helper vertices the proxies reference (16.9 -> 17.6 MB).

## 2026-10-04 - MakeHuman system assets

### Added
- `packages/human/assets/makehuman-system/` (17 MB): subset of the CC0 MakeHuman system asset pack - six young skins (African/Asian/Caucasian x female/male, 1024 JPEG), low-poly eyes with nine eye colours, 12 eyebrows, 4 eyelashes, 10 hairstyles (mesh, .mhclo fitting, greyscale diffuse for tinting, normal maps), CC0 license and `SOURCE.md` with the zip checksum.
- `tools/vendor-makehuman-system.mjs` (downloads and verifies the pack, resizes with sharp); `sharp` added as a root dev dependency.
- Integrity test: every proxy has one .mhclo fitting row per mesh vertex.

## 2026-10-04 - Body age 18-35

### Changed
- Body age range is 18-35 years. Ages 18-25 use the 25-year MakeHuman body (no child blending, which made 18-year-old bodies child-like, e.g. 154 cm male); 25-35 blends up to about 15 % towards the old targets.
- Child targets removed from the vendored assets and the morph pack (288 -> 192 targets).

## 2026-10-04 - MakeHuman body shaping

### Added
- `@cinelab/human` runtime: `BodyParams` (gender, age 18-90, muscle, weight, height, proportions, African/Asian/Caucasian mix) mapped to macro target weights (`makehuman/macro.ts`); CPU morphing with regrounding (`morph-data.ts`); skeleton refit to the morphed joints with preserved bone rotations (`body-shape.ts`); loader and `MakeHumanBody` r3f component.
- `/lab/human` test page: large viewport, right slider panel, ethnicity presets, measured height.
- `pnpm test:human:browser` (`apps/web/scripts/check-human.mjs`): load, preset/gender pixel changes, height slider range, no console errors, six screenshots.
- Tests: macro weighting (partitions of unity, adult clamp, one-sided modifiers) and shaping of the real body (all weighted targets exist, grounded, height range, skinned rest pose equals morphed mesh, bones follow, rotations preserved).

### Changed
- `pnpm dev` and `pnpm build` run `pnpm human:build` first.
- Morph manifest types moved to `makehuman/morph-manifest.ts`, shared by converter and runtime.

## 2026-10-04 - MakeHuman converter

### Added
- `pnpm human:build` (`packages/human/scripts/build-assets.ts`): converts the vendored MakeHuman data, with no external tools, into `makehuman-base.glb` (skinned body in metres, grounded, 14517 vertices with UV seams split, 163-bone default rig, top-4 weights, no unweighted vertices) and a morph pack (`makehuman-morphs.bin` + `.json`: source positions, render-to-source map, bone joint vertex lists, 288 targets as Uint16 indices + Int16 deltas). Output goes to `apps/web/public/human/` (gitignored); about 1.2 MB GLB and 25.4 MB morph pack (17.5 MB gzipped), built in about 2 s.
- Converter modules in `packages/human/src/makehuman/convert/` and `src/makehuman/normals.ts`, with unit tests and an end-to-end test that loads the GLB in three's GLTFLoader.

## 2026-10-04 - MakeHuman CC0 assets

### Added
- `packages/human/assets/makehuman/`: one-time snapshot of MakeHuman CC0 data from mpfb2 commit `d0a32e5` - hm08 base mesh, 288 adult macro targets (ethnicity, gender, age, muscle, weight, height, proportions; no baby targets), `macro.json`, default rig (163 bones) and weights, CC0 license and `SOURCE.md`. Data only; no mpfb2 code.
- `tools/vendor-makehuman.mjs`: reproduces the snapshot from the pinned commit.
- `@cinelab/human` `src/makehuman/target-file.ts`: `.target` parser with tests, plus asset integrity tests (license, vertex count, adult-only set, index bounds, rig/weights consistency).

## 2026-10-03 - Agent-friendly structure

### Changed
- Every source, test and script file is at most 200 lines. `Studio.tsx` (1789 lines) became a 130-line composition of hooks (`useSceneState`, `useStudioUi`, `useAssetActions`) and components (header, toolbar, panels, scene, lights, camera, model). Character editor, render contract and large tests were split the same way.
- Studio selection is one `selection` plus at most one side `panel` (`components/studio/ui-state.ts`) instead of nine separate flags; behaviour is unchanged.
- The jointed mannequin and `MannequinSpec` moved to `@cinelab/human`; `RigTube` was merged into the shared `TubeBetween`.
- Package `exports` now list only modules used by other packages.
- Tests: shared async timeout 5 s and test timeout 15 s, fixing cold-start flakes when packages run in parallel.

### Added
- `tools/check-structure.mjs` (`pnpm check:structure`): 200-line limit, metadata headers, package import boundaries and cycle detection; ESLint `max-lines: 200`.
- `pnpm check` runs structure check, lint, typecheck and tests.
- Root and per-package `AGENTS.md` (purpose, public API, dependencies, file map, test command); replaced the boilerplate README.

## 2026-10-03 - Workspace packages

### Changed
- The repository is now a pnpm workspace. Code moved (history kept) into packages with one-way dependencies:
  `@cinelab/core` <- `@cinelab/human` <- `@cinelab/character` <- `@cinelab/studio` <- `@cinelab/render-contract` <- `apps/web` (Next.js).
- Each package has its own `package.json` exports, `tsconfig.json` and Vitest project; `pnpm test` runs all projects, `pnpm --filter @cinelab/<name> test` runs one.
- The studio no longer imports the render contract: `Studio` takes an optional `scenePanel`, and `apps/web` composes it with `SceneJsonPanel` (`StudioScreen.tsx`).
- Browser scripts moved to `apps/web/scripts`; root scripts `pnpm test:studio:browser` and `pnpm test:e2e` run them.

## 2026-10-03 - Physical defocus only; late image read fix

### Removed
- Camera "Bokeh" slider and its stored value. Background blur is a result of focal length, f-number and focus distance (thin-lens circle of confusion), not a separate setting; the shader now always applies the physical amount (the old 50 % default showed half of it). Older saves with a `bokeh` field still load. The render contract no longer has `camera.bokeh`.

### Fixed
- A reference image whose file read finished after Cancel or Save was still stored and left orphaned; late reads are now discarded.
- Two editor tests were flaky because they asserted before the async file read finished and leaked a late write into the next test; they now wait for the thumbnail.

### Changed
- Browser check replaces "bokeh zero disables defocus" with "a 14 mm lens at f/22 keeps both depths sharp" (beyond hyperfocal distance).

## 2026-10-03 - Phase 6: render contract

### Added
- Provider-neutral render contract (`src/lib/render/contract.ts`): SceneJSON, render request and result schemas, status lifecycle with allowed transitions, and an error model with retryable codes.
- SceneJSON builder (`src/lib/render/scene-json.ts`): character, outfit (empty until Phase 5), subject pose, camera optics and placement, lights relative to the subject, and backdrop, in metres and degrees; lists missing pieces instead of building partial scenes. Render requests carry a SHA-256 hash of the canonical scene.
- Render history repository (`src/lib/render/render-repository.ts`) linking every result to the exact scene JSON and provider parameters.
- **Scene JSON** header button in the studio showing the current request, with copy and download.
- `docs/render-contract.md`.

## 2026-10-03 - Backdrop selection fix

### Fixed
- A single click on a light, camera or the model selected it and then immediately handed the selection to the backdrop behind it, so objects could only be picked by press-and-hold. The backdrop now only reacts when it is the nearest object under the pointer.
- Clicking the backdrop while something is selected now just clears the selection; with nothing selected it toggles the backdrop hotspot, so the hotspot no longer stays open.

### Changed
- Camera body sizes, rig scale, lens origin offset and shutter speeds moved to `src/lib/studio/camera-rig.ts` so non-UI code can use them.

## 2026-10-03 - Framing and pose presets

### Added
- Camera framing presets (Portrait 85 mm, Half body 50 mm, Full body 35 mm) in the camera panel. They place a level camera in front of the subject at the distance that fits the frame height in the 16:9 viewfinder, scaled to the character's height, and set lens, zoom, aperture limits and focus (`src/lib/studio/framing.ts`). Stored as `framing`; moving, rotating, zooming or changing lens/height clears it.
- Jointed placeholder mannequin (shoulders, elbows, hips, knees, spine, head) and pose presets: Standing, Relaxed, Hands on hips, Walking, Arms up (`src/lib/studio/poses.ts`). The Pose tool is enabled when a character is in the scene; the pose is stored on the scene model.

### Changed
- Right-hand settings panels share one class and leave room for the header chips and toolbar (no longer overlap the asset count).
- `lensOriginOffset` is shared between the camera feed and framing.

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