---
type: changelog
category: release-notes
scope: cinelab-studio
description: Changelog for Cinelab Studio. Append before every commit.
last-updated: 2026-10-07T00:00:00Z
last-model: claude-opus-5-5
last-change: character data v2 (plan 2.9)
---

# Changelog

All notable changes to Cinelab Studio are recorded here. Format mirrors
Keep a Changelog; dates are absolute.

## 2026-10-07 - Character data v2 (plan 2.9)

### Added
- `human-schema.ts`, `legacy-mapping.ts`: the MakeHuman human (shape, appearance, size, pose) in the character and the mapping to and from the v1 fields.
- Creator Name + Save (`use-creator-persistence.ts`); deep link `/characters/creator?id=...`.
- Library links "Create in 3D" and "Creator" per character.
- Tests `character-v2.test.ts`, `use-creator-persistence.test.ts`; browser `check-character-data.mjs` (chained in `test:human:browser`).

### Changed
- Character schema version 2; v1 records migrate on parse (same storage key).

## 2026-10-07 - Facial hair placeholder (plan 2.7b deferred)

### Added
- Head tab: disabled `Facial hair` choice (None / Beard / Moustache, "Coming later.") with a test.

### Changed
- `docs/human-creator-plan.md`: D7 reopened - file headers of the Bodyparts 05/06 beards carry AGPL3 boilerplate in their `.obj`; 2.7b deferred by the user.

## 2026-10-07 - Dense body topology (plan 2.8)

### Added
- `packages/human/src/makehuman/subdivision.ts`: Catmull-Clark level 1 plus limit projection as sparse stencils, with tests.
- `packages/human/src/makehuman/convert/dense-mesh.ts`: body cage quads and the level-1 render mesh with face-varying UVs.
- `docs/images/topology/`: before/after portraits and a close-up.

### Changed
- Converter writes the dense body GLB (107,024 triangles) with subdivided skin weights; morph pack version 2 adds `denseCount` and `cageQuads`.
- `applyBodyShape` subdivides morphed source positions; `measureTopology(data)` triangulates the coarse cage (measurements unchanged).
- Deformation QA baseline rebased on the dense body (`docs/deformation-qa.md` section 2a).

## 2026-10-07 - Decisions D5 and D7

### Changed
- `docs/human-creator-plan.md`: D7 resolved (facial hair CC0 + CC-BY with attribution, AGPL-boilerplate files excluded) as new step 2.7b; D5 resolved (denser topology) and step 2.8 rescoped to a build-time Catmull-Clark level with a sparse subdivision matrix.

## 2026-10-06 - Plan resume point

### Changed
- `docs/human-creator-plan.md`: section 2 marks 2.1-2.7 done, next 2.8, open decision D7 to answer on resume.

## 2026-10-06 - Appearance polish (human creator plan Phase 2.7)

### Added
- `packages/human/src/makehuman/skin-detail.ts` (+ test): face band flattening, tiled micro-normal.
- `eyes/colours/darkbrown.png` derived from the stock brown iris in `tools/vendor-makehuman-system.mjs`; presets and the default use it.
- Creator viewport: procedural RoomEnvironment light (no external files).
- `apps/web/scripts/capture-appearance.mjs`; before/after portraits in `docs/images/appearance/`.

### Changed
- Skin, eye, hair, eyebrow and eyelash materials (`materials.ts`, `body-controller.ts`): self-lit eye whites, matte hair, alpha-to-coverage strands.
- `check-head.mjs` threshold 0.01 % of pixels for the finest face controls under the softer light.
- `docs/human-creator-plan.md`: 2.7 done, new decision D7 (facial hair licences), next 2.8.

## 2026-10-06 - Character tab - head (human creator plan Phase 2.6)

### Added
- `packages/human/src/makehuman/head-regions.ts`: all 117 head modifiers in ten groups with readable labels; face-shape presets.
- `packages/character/src/components/creator/HeadTab.tsx`; Head tab with a three-quarter portrait camera (`CreatorViewport` `focus`).
- Tests: `head-regions.test.ts`, `HeadTab.test.tsx`; browser `apps/web/scripts/check-head.mjs`; portraits `docs/images/head/`.

### Changed
- Region controls support unipolar modifiers and end words (`body-regions.ts`, `RegionGroup.tsx`).
- `docs/human-creator-plan.md`: 2.6 done, next 2.7.

## 2026-10-06 - Character tab - body (human creator plan Phase 2.5)

### Added
- `packages/human/src/makehuman/ethnic-presets.ts`: Asian, African, European, Latin presets that load a standard model (D3).
- `packages/human/src/makehuman/body-regions.ts`: seven body regions, 23 controls (D4).
- `packages/character/src/creator/` (`creator-model.ts`, `use-creator.ts`) and `src/components/creator/` (`CharacterCreator`, `BodyTab`, `SizeFields`, `RegionGroup`, `CreatorViewport`); route `apps/web/src/app/characters/creator`.
- Tests: `body-regions.test.ts`, `creator-model.test.ts`, `BodyTab.test.tsx`; browser `apps/web/scripts/check-creator.mjs`; images `docs/images/creator/`.

### Fixed
- `MakeHumanBody`: the body was never shaped when no `onShape` listener was passed (optional call skipped its argument).

### Changed
- `@cinelab/character` depends on three, @react-three/fiber and @react-three/drei for the creator viewport.
- `docs/human-creator-plan.md`: 2.5 done, D3/D4 resolved, next 2.6.

## 2026-10-06 - Body types (human creator plan Phase 2.4)

### Added
- `packages/human/src/makehuman/body-types.ts`: Slim, Average, Athletic, Muscular, Curvy, Soft, Heavy with intensity; `switchBodyType` keeps typed cm/kg.
- `packages/human/src/makehuman/body-types.test.ts`: AC (all types keep cm/kg within 0.5 for female and male), packed modifiers, Average no-op, wider mass ranges, intensity/gender scaling.
- Lab `BodyTypePanel.tsx`; browser check `apps/web/scripts/check-body-types.mjs`; images `docs/images/body-types/`.

### Changed
- `shape-model.ts`: `ShapeParams.bodyType`, applied in `shapeTargetWeights`; `DEFAULT_SHAPE.bodyType` = Average.
- Lab: measurement topology computed once in `page.tsx` and shared by `MeasurePanel` and `BodyTypePanel`.
- `docs/human-creator-plan.md`: 2.4 done, D2 resolved, next 2.5.

## 2026-10-06 - Aion 2 creator notes

### Added
- `docs/aion2-creator-notes.md`: UX reference notes (Aion 2 body tab) for after the human creator plan; the plan is unchanged.

## 2026-10-06 - Anthropometry and solvers (human creator plan Phase 2.3)

### Added
- `packages/human/src/makehuman/anthropometry.ts`: height, closed-mesh volume, mass (x 980 kg/m3), natural waist and BMI.
- `packages/human/src/makehuman/mesh-slice.ts`: horizontal cross-section loops and convex hull girth.
- `packages/human/src/makehuman/body-solver.ts`: typed cm/kg solved into height/weight parameters within 0.05 cm / 0.05 kg; out-of-range input clamped with feasible ranges.
- Tests: `mesh-slice.test.ts`, `anthropometry.test.ts`, `body-solver.test.ts` (AC: 0.5 cm / 0.5 kg on four bodies, clamping, gender-dependent ranges).
- Lab `/lab/human`: `MeasurePanel.tsx` (measurements, cm/kg inputs, range notice); browser check `apps/web/scripts/check-measure.mjs`.

### Changed
- `docs/human-creator-plan.md`: 2.3 done, next 2.4; mass-range finding recorded for body types.

## 2026-10-05 - Plan progress

### Changed
- `docs/human-creator-plan.md`: section 2 is now a progress table with the resume point (next: 2.3).

## 2026-10-05 - Shape model v2 (human creator plan Phase 2.2)

### Added
- `shape-model.ts`: `ShapeParams` = macro parameters + breast cup size and firmness + local modifiers. Breast macros weighted female x age x muscle x weight x cup x firmness (defaults add nothing); local modifiers as opposite-pair ReLU coefficients (adapted from Anny), both sides alike; unipolar shapes 0..1.
- Runtime loads `makehuman-modifiers.bin/.json` (`addModifierPack`); morph targets carry their pack's scale.
- `/lab/human`: breast size and firmness sliders.
- Tests: identical bodies to the macro model for shared parameters, every modifier resolves at both ends, ReLU weighting, breast macros (female only, defaults neutral); browser check of breast size with screenshot.

### Changed
- `applyBodyShape`, `BodyController.setShape` and `MakeHumanBody` take `ShapeParams` (a superset of `BodyParams`).

## 2026-10-05 - Modifier data (human creator plan Phase 2.1)

### Added
- Vendored MakeHuman CC0 modifier data: `target.json` and 668 targets of 20 groups (arms, breast incl. adult cup/firmness macros, buttocks, feet, hands, hip, legs, pelvis, stomach, torso; head, forehead, eyebrows, eyes, nose, cheek, mouth, chin, ears, neck). Not vendored: asym, expression, genitals. `tools/vendor-makehuman.mjs` extended; existing files unchanged.
- `modifier-catalogue.ts`: 200 modifiers (83 body, 117 head) with section, readable label, bipolar/unipolar kind, left/right targets and end words.
- Converter writes `makehuman-modifiers.bin/.json` (catalogue targets + 144 breast macros, same source indexing as the morph pack): 5.1 MB raw, 1.4 MB gzip, budget checked in tests.
- Tests: catalogue (counts, sides, labels, unipolar shapes, vendored files) and modifier pack (coverage, budget).

## 2026-10-05 - Deformation QA (human creator plan Phase 1.6)

### Added
- `qa-poses.ts`: fixed QA pose set (arms up, elbows 140, deep squat, fists, head turn, jaw open) inside the joint limits.
- `deformation-metrics.ts`: collapsed and inverted triangle counts of a posed mesh per dominant bone.
- `deformation-qa.test.ts`: regression guard against the measured baseline.
- `docs/deformation-qa.md` with images (`docs/images/deformation-qa/`), `apps/web/scripts/capture-deformation.mjs`.
- `/lab/human`: QA pose picker and a Hands camera view; `loadPose` accepts a root offset.

### Decided
- Linear blend skinning stays. Laplacian weight smoothing (no material change), dual quaternion skinning (shoulder bulge, stepped silhouettes from MakeHuman's stepped weights) and a 50 % blend were implemented, measured and removed.

## 2026-10-05 - Two-bone IK (human creator plan Phase 1.5)

### Added
- `ik-solver.ts`: analytic two-bone IK for arms and legs, exact for the real hinge axis (elbow/knee local X): flex solves the shoulder/hip-to-effector distance (two roots, the one the joint limits distort least wins), then the limb turns onto the target and towards an optional pole; the hand or foot keeps its world orientation; results clamped to joint limits.
- `limbs.ts` (four limbs), `pose-ik.ts` (`settleIk`: IK limbs re-solved after every edit and stored as plain rotations, so undo, numeric bar and FK/IK switching stay exact; editing a limb bone moves its target).
- Pose editor: IK targets per limb in the snapshot, `setIkTarget`, `setRotations`; reset all returns every limb to FK.
- `IkTargetGizmo.tsx`, `ikTarget` and `onBody` props on `MakeHumanBody`.
- `/lab/human`: FK/IK toggles per limb, Move on an IK effector drags its target, feet stay planted while the root moves.
- Tests: reach within limits for targets generated from random in-limit poses on all four limbs (5 mm), stretching, flat foot and ankle-limit precedence, pole, planted feet on root moves, hands stay while the spine bends, re-targeting, FK/IK switch, undo; browser check `check-ik.mjs` with screenshots.

### Changed
- Ankle dorsiflexion limit -20 -> -30 degrees (weight-bearing range).

## 2026-10-05 - Selection and pose gizmo (human creator plan Phase 1.4)

### Added
- `pose-editor.ts`: pure pose editor - click selects, Shift adds/removes (last = primary), rotations clamped to joint limits, root offset, undo/redo with exact snapshots (a drag is one step, clamped no-op edits leave no step), reset selected, reset all, presets.
- `pose-numeric.ts`: numeric X/Y/Z degrees in joint-limit space.
- `PoseGizmo.tsx` (drei TransformControls) and `gizmo` / `rootOffset` props on `MakeHumanBody`: rotate in local or world axes, clamped while dragging; move for the root in world axes. `applyBodyPose` moves the root from its stored rest position.
- `/lab/human`: `PosePanel` (numeric bar, Rotate/Move, Local/World, Undo, Redo, Reset selected, Reset all), Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Ctrl+Y, Escape deselects, click on empty space deselects; Limit demo now loads through the editor.
- Tests: pose editor (selection, limits, numeric round-trip, exact undo/redo, drag as one step, resets, presets), root offset across re-shapes; browser check `check-pose.mjs` (numeric round-trip and clamp, gizmo drag within limits, undo/redo buttons and keys, reset, root move) with screenshots.

### Changed
- The root handle is a ring around the hips (it covered the spine05 handle at the same point).

## 2026-10-05 - Joint handles (human creator plan Phase 1.3)

### Added
- `handle-spec.ts`: one handle per posable bone - centre line white, right red, left blue, one colour per finger (metacarpals follow their finger), IK end effectors (wrists, feet) as triangles, sizes by joint group, finger toggle membership.
- `JointHandles.tsx` and `handles` prop on `MakeHumanBody`: handles portalled into their bones (follow morphs and poses), drawn on top of the body and clickable through it, hover enlarges, selected turn yellow, Shift+click adds.
- `/lab/human`: Handles and Finger handles toggles, selection and hover readout, `LabProbe` test hook, `LabToggle` button.
- Tests: handle spec coverage and colours; browser check `check-handles.mjs` (toggles, 2 x 19 finger handles, hover, click through the mesh, Shift+click, handles follow morph and pose) with screenshots. Shared helpers moved to `scripts/lab-helpers.mjs`.

### Changed
- Breast and pelvis bones are no longer posable (soft-tissue and hip-bone helpers; their handles overlapped spine and root).

## 2026-10-05 - Joint limits (human creator plan Phase 1.2)

### Added
- `joint-limits.ts`: anatomical limits for every posable bone (spine, neck, head, jaw, eyes, clavicle, shoulder, arm, elbow and knee hinges, wrist, hand, thumb, fingers, hip, ankle, toes) as swing X / swing Z / twist Y degrees on the rest frame; right side mirrors the left; facial and tongue bones excluded. `clampBoneDelta` clamps a pose delta.
- `swing-twist.ts`: gimbal-free split of a bone rotation into swing vector and twist.
- `body-pose.ts` and `pose` prop on `MakeHumanBody`: poses are applied clamped; `limitDemoPose` for checks.
- `/lab/human`: "Limit demo" pose and a side view.
- Tests: table coverage against the rig, mirror rule, per joint group clamping never exceeds limits, in-range poses unchanged; on the real skeleton right frames mirror left ones and knees, elbows, hips, shoulders, feet and spine bend the anatomical way on both sides. Browser check with front and side screenshots.

## 2026-10-05 - Bone rest frames (human creator plan Phase 1.1)

### Added
- `bone-frames.ts`: Blender head/tail/roll bone basis (vec_roll_to_mat3, adapted via Anny) built in Blender Z-up axes and converted to our Y-up axes; pose delta helpers `bonePoseDelta` / `setBonePoseDelta`.
- Converter writes each bone's Blender roll into the morph manifest.
- `/lab/human`: "Bone axes" overlay (`bone-axes.ts`, `showBoneAxes` on `MakeHumanBody`).
- Tests: basis math (orthonormal, roll direction, -Y case), plan 1.1 acceptance on five body shapes (all 163 bones local Y on the tail within 1 degree, skinned rest pose within 0.1 mm over all vertices), axis mapping against the rig's default positions; browser check of the overlay with screenshots.

### Changed
- Skeleton refit sets real rest frames after every morph instead of identity rotations, and keeps pose deltas (rest * delta) across re-shapes.

## 2026-10-05 - Anny study and attribution (human creator plan Phase 0.2)

### Added
- `docs/anny-notes.md`: what we adapt from naver/anny (commit `d6fc027`), what we only reference and what we skip, with file and line references - phenotype weighting, anthropometry, bone frames, inversion, facial actions - plus license and provenance notes.
- `NOTICE`: Apache 2.0 attribution for Anny-adapted algorithms and CC0 data credits.

### Changed
- `docs/human-creator-plan.md`: steps 0.1 and 0.2 marked done; D1 resolved; new decision D6 (bone roll stability).

## 2026-10-05 - Main merge (human creator plan Phase 0.1)

### Changed
- Decision D1: `fix/studio-camera-persistence`, `refactor/packages` and `feat/makehuman-assets` form one linear chain, so `main` was fast-forwarded from `f48c3df` to `2d0b414` in a single step.
- Verified on `main`: `pnpm check` (unit 208/208), `pnpm build`, studio browser 8/8, human browser all PASS, e2e 16/16.

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