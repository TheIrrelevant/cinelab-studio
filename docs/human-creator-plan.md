---
type: plan
description: Step-by-step plan for the Cinelab human creator - skeleton and gizmo foundation, detailed body and face creation, expressions and hands, studio integration.
last-updated: 2026-10-07
last-model: claude-opus-5-5
depends_on: [../packages/human/AGENTS.md, ../AGENTS.md, ./render-contract.md, ./anny-notes.md]
---

# Human creator plan

## 1. Goal

Build a human creation screen in the spirit of *HAELE 3D - Pose Studio Max* (Steam app 4048520): a very
detailed human on a high-quality skeleton driven by gizmos, where every detail of the body and face can
be changed. We build something similar, not a copy.

**Now:** skeleton + gizmo foundation, detailed body and face creation, expressions and hands.
**Later (out of scope for this plan):** Preset / Scene / Environment tabs, HDRI backgrounds, props,
multiple characters, pose libraries, anatomy (muscle) view.
**Not wanted now:** wooden mannequins.

## 2. Progress (resume here)

**Status 2026-10-06 session end (branch `main`):** Phase 0 and Phase 1 complete; Phase 2 steps 2.1-2.7 complete (beard assets wait for decision D7).
**2026-10-07:** D7 resolved (CC0 + CC-BY with `NOTICE` attribution, AGPL-boilerplate files excluded);
D5 resolved (denser topology). 2.8 done (dense body). 2.7b deferred: D7 reopened after the file
license check (see D7); the Head tab shows facial hair disabled. User priority: the female side.
**Next:** 2.9 Character data v2 or female-side work (needs approval). Separate notes for after the plan:
`docs/aion2-creator-notes.md`.

| Phase | Step | Status |
|---|---|---|
| 0 | 0.1 Branch strategy, 0.2 Anny study | done |
| 1 | 1.1 Bone orientation, 1.2 Joint limits, 1.3 Joint handles, 1.4 Selection and gizmo, 1.5 IK, 1.6 Deformation QA | done |
| 2 | 2.1 Modifier data, 2.2 Shape model v2, 2.3 Anthropometry and solvers, 2.4 Body types, 2.5 Character tab - body, 2.6 Character tab - head, 2.7 Appearance polish | done |
| 2 | 2.8 Denser topology (D5) | done |
| 2 | 2.7b Facial hair assets (D7) | deferred (disabled UI placeholder) |
| 2 | 2.9 Character data v2 | open |
| 3 | 3.1-3.4 Facial actions, expressions, hands, visemes | open |
| 4 | 4.1-4.3 Studio integration | open |

Current state of the body: MakeHuman hm08 with real bone frames, joint limits, handles, gizmo, undo,
two-bone IK with planted feet, deformation QA baseline (linear blend skinning kept), 200 local modifiers
and breast cup/firmness in shape model v2, mesh measurements, a cm/kg solver and seven body types. Lab page `/lab/human` exposes all of it; the creator `/characters/creator` has the Body and Head tabs. Known gaps: shoulder
and deep hip correctives (docs/deformation-qa.md); UI is still raw 0-100 % sliders (2.5 / 2.6). The dev
server is not left running; browser checks start a temporary one.

## 3. Sources and licenses

| Source | Use | License | Rule |
|---|---|---|---|
| MakeHuman / MPFB2 data (`src/mpfb/data`) | mesh, targets, rig, weights | CC0 | vendor data only |
| MakeHuman system asset pack | skins, eyes, hair, eyebrows, eyelashes | CC0 | vendored, checksum-pinned |
| Face Units 01 asset pack | ARKit-style facial actions (52) | CC0 | vendor in Phase 3 |
| Visemes 01/02 asset packs | lip-sync shapes | CC0 | optional |
| [naver/anny](https://github.com/naver/anny) | reference for phenotype blendshapes, anthropometry (height, mass = volume x 980 kg/m3, waist, BMI), facial actions, parameter inversion | Apache 2.0 | adapt with attribution in `NOTICE` |
| MPFB2 code | - | GPL | never copy |
| MB-Lab, CharMorph models | - | AGPL (propagates to output) | do not use |
| Anny `smplx` topology | - | non-commercial | do not use |
| HAELE 3D | UX reference only | proprietary | no code or assets |

## 4. Working rules

- One step at a time; each step ends with tests, browser screenshots, CHANGELOG, commit and push,
  and waits for approval before the next step.
- Every source file at most 200 lines; packages keep one-way dependencies (`core <- human <- character
  <- studio`). Character UI lives in `@cinelab/character`, the body in `@cinelab/human`.
- In-app three.js only; no Blender or external pipelines at runtime.
- Each step lists acceptance criteria (AC); a step is done only when all AC pass.

## 5. Phase 0 - Preparation

**0.1 Branch strategy.** Decide how `refactor/packages` and `feat/makehuman-assets` reach `main`
(open decision D1). AC: `main` builds and all checks pass after the merge.
**Done 2026-10-05:** fast-forward of the linear chain, verified on `main` (commit `02391d3`).

**0.2 Anny study and attribution.** Read `phenotype.py`, `anthropometry.py`, `anny_inverter.py`,
`facial_actions.py`, `rigged_model.py`; write `docs/anny-notes.md` (what we adapt and why); add `NOTICE`.
AC: notes list every adapted algorithm with file references.
**Done 2026-10-05:** `docs/anny-notes.md`, `NOTICE`.

## 6. Phase 1 - Skeleton and gizmo foundation

**1.1 Bone orientation.** Build real bone frames from head, tail and roll (local Y along the bone,
roll around it), re-derived after every morph. AC: local Y points at the tail within 1 degree for all
163 bones on five body shapes; rest-pose skinning error below 0.1 mm.
**Done 2026-10-05:** `bone-frames.ts`, refit in `body-shape.ts`, `skeleton-frames.test.ts`; lab "Bone axes" overlay.

**1.2 Joint limits.** Anatomical rotation limits per joint (elbow and knee hinge, neck, spine, wrist,
fingers, toes, jaw) as data plus a clamp function. AC: table covers every posable bone; clamped poses
never exceed limits; tests per joint group.
**Done 2026-10-05:** `joint-limits.ts` (swing X/Z + twist Y per bone, left table mirrored to right), `swing-twist.ts`, `body-pose.ts`; direction tests on the real skeleton; lab "Limit demo" pose and side view.

**1.3 Joint handles.** On-body handles: centre line white, right red, left blue, one colour per
finger; IK end effectors as triangles; hover highlight; toggle all handles and finger handles.
AC: every posable bone has a handle that follows morphs and poses; handles stay clickable through the
mesh.
**Done 2026-10-05:** `handle-spec.ts`, `JointHandles.tsx` (103 handles; breast and pelvis helpers made non-posable), lab Handles / Finger handles toggles and selection readout; `check-handles.mjs`.

**1.4 Selection and gizmo.** Click to select, Shift+click to add; rotate gizmo (and move for root and
IK targets); local/world switch; numeric X/Y/Z bar; undo/redo; reset selected / reset all.
AC: gizmo rotation respects limits; numeric edits round-trip; undo restores exact pose.
**Done 2026-10-05:** `pose-editor.ts`, `pose-numeric.ts`, `PoseGizmo.tsx` (root move in world axes; IK target move comes with 1.5), lab `PosePanel` with undo/redo/reset and Escape to deselect; root handle is now a ring around the hips; `check-pose.mjs`.

**1.5 IK.** Two-bone IK for arms and legs with pole targets; feet keep floor contact; FK/IK switch per
limb. AC: dragging a hand target reaches any point inside arm reach without joint-limit violations.
**Done 2026-10-05:** `ik-solver.ts` (exact for the real hinge axis; two roots, least limit distortion), `limbs.ts`, `pose-ik.ts` (IK results stored as rotations, feet planted on root moves, editing a limb bone re-targets it), `IkTargetGizmo.tsx`, lab FK/IK toggles; ankle dorsiflexion limit widened to 30 degrees (weight-bearing) so feet stay flat in squats; `check-ik.mjs`.

**1.6 Deformation quality.** Fixed QA pose set (arms up, elbow 140, deep squat, fist, head turn, jaw
open); screenshots; weight smoothing or corrective fixes where needed. AC: QA sheet in
`docs/deformation-qa.md` with before/after images and no collapsing joints.
**Done 2026-10-05:** `qa-poses.ts`, `deformation-metrics.ts`, regression test, lab QA pose picker and Hands view, `capture-deformation.mjs`; linear blend skinning kept (no joint loses volume, at most 1.5 % of triangles affected); weight smoothing, dual quaternion skinning and a 50 % blend measured and rejected with images. Open: shoulder top above 110 degrees abduction and deep hip crease need corrective shapes later.

## 7. Phase 2 - Detailed human creation

**2.1 Modifier data.** Vendor body and face modifier targets (about 70 body, about 134 face, breast
cup size and firmness macros); converter builds a modifier catalogue (group, label, decr/incr targets,
left/right pairs) from `target.json`. AC: catalogue tests; morph pack budget documented.
**Done 2026-10-05:** 668 files vendored (20 groups + target.json); catalogue of 200 modifiers (83 body, 117 head; 8 unipolar face/chin shapes) and 144 breast macros in a separate modifier pack (5.1 MB raw, 1.4 MB gzip; budget 6 / 1.6 MB).

**2.2 Shape model v2.** Phenotype (gender, age, muscle, weight, height, proportions, cup size,
firmness, ethnicity) plus local modifiers, following Anny's phenotype logic. AC: same results as the
current macro model for shared parameters; every modifier resolves to packed targets.
**Done 2026-10-05:** `shape-model.ts` (macro.ts unchanged; breast macros female x age x muscle x weight x cup x firmness; ReLU modifier pairs, symmetric sides), modifier pack loaded at runtime with per-target scale; identical bodies for shared parameters (max difference 0); lab breast size/firmness sliders.

**2.3 Anthropometry and solvers.** Measure height, mass (volume x 980), waist and BMI on the mesh;
solve typed height (cm) and weight (kg) into parameters; report the feasible range for the current
gender and body type. AC: solved body within 0.5 cm and 0.5 kg; out-of-range input is clamped and shown.
**Done 2026-10-06:** `anthropometry.ts` (height floor to crown, closed-mesh volume x 980, natural waist = smallest torso hull girth between spine04 and spine01 via `mesh-slice.ts`, BMI), `body-solver.ts` (nested bracketed Illinois roots: `height` for a weight, `weight` for the height-matched mass; 26-44 morphs, about 0.1 s), lab cm/kg panel, `check-measure.mjs`. Finding for 2.4: the `weight` macro alone spans a narrow mass band at a fixed height (female 165 cm: 43-58 kg; male 182 cm: 64-76 kg; muscle 0.9 widens it to 58-90 kg), so heavier typed weights clamp until body types add muscle and fat.

**2.4 Body types.** Named types (list is open decision D2) mapped to muscle, proportions and fat
distribution while height and weight stay as typed. AC: switching type keeps cm and kg.
**Done 2026-10-06:** D2 = Slim, Average, Athletic, Muscular, Curvy, Soft, Heavy plus a 0-100 % intensity. `body-types.ts`: a type is offsets (muscle, proportions, female cup, local modifiers; Curvy at 40 % on males) on top of the user's values, resolved inside `shapeTargetWeights`; `switchBodyType` re-solves the kept cm/kg. Kept within 0.5 cm / 0.5 kg for all types (female 165/55, male 180/74; unit + browser `check-body-types.mjs`). Reachable mass at 180 cm male: Average 62-75 kg, Muscular 64-105, Heavy 72-103, Soft 63-112 (the 2.3 finding is solved by types). Images: `docs/images/body-types/types-{female,male}.jpg` (order Slim ... Heavy). At equal kg the differences are moderate; Soft and Heavy both read mainly as belly - tune in 2.5 with region sliders if needed.

**2.5 Character tab - body.** Gender toggle; ethnicity selection (D3); height and weight inputs; body
type cards; region sliders for breast size and firmness, buttocks and further regions (D4).
AC: every control changes the body as labelled; browser check with screenshots.
**Done 2026-10-06:** D3 = presets Asian, African, European, Latin (each loads a standard model: ethnicity mix, skin tone, eye colour, hairstyle per gender, hair colour; head modifiers cleared; gender, cm/kg, body type and regions kept) - `ethnic-presets.ts`. D4 = all proposed regions (chest, shoulders/torso, waist/hips, stomach, arms, legs, neck; 23 controls, breast only for female) - `body-regions.ts`. Creator in `@cinelab/character`: `creator-model.ts` (locked cm/kg re-solved on every change, request kept when clamped, note), `use-creator.ts` (region sliders re-solve 250 ms after the last change), `CharacterCreator`, `BodyTab`, `SizeFields`, `RegionGroup`, `CreatorViewport`; route `/characters/creator` (in memory until 2.9). Browser `check-creator.mjs`: every control changes the frame, cm/kg held within 0.5, Waist widens the measured waist. Fixed a latent `MakeHumanBody` bug: `onShape?.(setShape())` skipped shaping without an `onShape` listener. Images: `docs/images/creator/`. Notes: "Belly" at +100 reads as pregnancy (MakeHuman `stomach-pregnant` target); the creator is not linked from the library yet (2.9).

**2.6 Character tab - head.** Collapsible groups: head shape, forehead, eyebrows, eyes, nose, cheeks,
mouth, chin, ears, neck; symmetric left/right; per-group reset; face-shape presets.
AC: all face modifiers reachable; portrait screenshots per group.
**Done 2026-10-06:** `head-regions.ts` turns all 117 head modifiers into controls in ten groups (readable labels and end words; MakeHuman labels repeat), sided modifiers move both sides; face-shape presets Natural, Oval, Round, Square, Heart, Long, Diamond, Triangular (one unipolar head shape at 0.7). `HeadTab.tsx`, Head tab in the creator with a three-quarter portrait camera; `RegionGroup` handles unipolar controls and end words. Browser `check-head.mjs`: every face shape and all 117 controls change the portrait (23 fine-detail controls change it by 0.04-0.2 % of pixels), group resets; portraits in `docs/images/head/`.

**2.7 Appearance polish.** Eye whites, skin detail, hair materials; look for CC0 beard and mustache
assets. AC: before/after portraits.
**Done 2026-10-06:** face band removed (low-frequency flattening of the face UV island in the skin compositor, `skin-detail.ts`); tiled procedural micro-normal on the skin; eye whites lit by their own texture (emissive map); `darkbrown` eye colour derived from the maroon stock `brown` (vendor script, presets use it); hair and eyebrows matte (roughness 0.82) with alpha-to-coverage edges; procedural RoomEnvironment light in the creator. Portraits: `docs/images/appearance/{female,male}-{before,after}.jpg` (`capture-appearance.mjs`). Not solved: hairline cut-outs of the stock hair textures stay jagged in close-ups; hair reads as a shell (asset geometry). Beards: the system pack has none; candidates in MakeHuman Bodyparts 05 (CC0) and 06 (CC-BY) packs - see D7.

**2.7b Facial hair assets (D7).** Vendor Bodyparts 05 (CC0: viking moustache/beard, faun beard) and
Bodyparts 06 (CC-BY: grinsegold full beard and moustache) as checksum-pinned proxies; skip files with
AGPL boilerplate; CC-BY authors in `NOTICE`. AC: beards fit all body types and follow face modifiers;
license test fails on a missing attribution.
**Deferred 2026-10-07:** the file check found AGPL3 boilerplate in the `.obj` of every candidate except
`elvs_scruffy_beard1` (CC-BY, long scruffy beard - poor fit for 18-35). Pack zips: bodyparts05_cc0.zip
SHA-256 `262bba42...28fd`, bodyparts06_cc-by.zip `09ed7143...e770`. User decision: keep the choice
visible but disabled in the Head tab (`Facial hair: None / Beard / Moustache`, "Coming later.") and
revisit later.

**2.8 Denser topology (D5).** No CC0 high-resolution hm08 exists, so the denser mesh is derived from
hm08 at build time: one Catmull-Clark level on the body faces only (helper geometry excluded), stored as
a sparse subdivision matrix S (dense = S x coarse). Morphs stay on the coarse mesh (pack size
unchanged); dense positions, UVs and skin weights (top-4, renormalised) come from S. Proxies (hair,
eyebrows, eyelashes, beards) keep fitting against the coarse mesh. AC: about 4x body faces;
measurements (2.3) unchanged; rest-pose dense surface within 1 mm of the limit surface; before/after
portraits in `docs/images/topology/`; creator stays above 60 fps at portrait framing; load time and
download size reported.
**Done 2026-10-07:** `subdivision.ts` (level-1 + limit stencils, verified on a cube against five more
refinement levels), `convert/dense-mesh.ts` (face-varying linear UVs), dense skin weights in
`skin-weights.ts`; morph pack v2 carries `cageQuads` and `denseCount`; measurements triangulate the cage.
Body: 13,378 -> 53,512 quads (107,024 triangles), 53,514 dense vertices. Cost: GLB 1.2 -> 4.4 MB, morph
pack +0.2 MB, stencil build about 120 ms once per load, +7 ms per shape change, about 220 fps at portrait
framing (Apple M1, uncapped). Cage-to-limit shift: mean 0.8 mm, p95 2.1 mm, max 6.6 mm. Deformation QA
rebased (docs/deformation-qa.md 2a). Images: `docs/images/topology/` - ear rim and jaw line no longer
faceted; lip edge slightly softer.

**2.9 Character data v2.** Schema for phenotype, modifiers, appearance and pose; migration from the
current character store; save, load, deep link. AC: old characters migrate; round-trip tests.

## 8. Phase 3 - Face and hands

**3.1 Facial actions.** Vendor Face Units 01 (52 ARKit-style actions); eye look and blink controls
(override eyes); jaw open. AC: each action moves only its region; combined actions stay stable.

**3.2 Expression presets.** Preset grid with large hover preview; thumbnails rendered in-app.
AC: at least 20 expressions; applying one is undoable.

**3.3 Hands.** Hand pose presets with hover preview, left/right selection, finger handles, mirror
hand pose. AC: 15 presets; mirrored pose matches within 1 degree.

**3.4 Visemes (optional).** AC: decided in Phase 3 review.

## 9. Phase 4 - Studio integration

**4.1** Replace the studio mannequin with the MakeHuman body loaded from the character store.
**4.2** Persist pose and expression in the scene; extend SceneJSON with body, appearance and pose.
**4.3** Remove mannequin entry points from the UI.
AC: studio e2e passes with the new body; render contract tests updated.

## 10. Open decisions

| ID | Decision | Needed before |
|---|---|---|
| D1 | Resolved: fast-forward `main` to `feat/makehuman-assets` (linear chain) | 0.1 |
| D2 | Body type list - resolved 2026-10-06: Slim, Average, Athletic, Muscular, Curvy, Soft, Heavy + intensity | 2.4 |
| D3 | Ethnicity - resolved 2026-10-06: presets Asian, African, European, Latin that load a standard model | 2.5 |
| D4 | Body regions - resolved 2026-10-06: chest, shoulders/torso, waist/hips, stomach, arms, legs, neck | 2.5 |
| D5 | Close-up mesh quality - resolved 2026-10-07: denser topology (user choice; comparison skipped) | 2.8 |
| D7 | Facial hair - reopened 2026-10-07: CC0 + CC-BY was chosen, but every candidate except `elvs_scruffy_beard1` carries AGPL3 boilerplate in its `.obj` (viking/faun `.mhclo` are CC0, their `.obj` are not; grinsegold beard and moustache are AGPL3 in both). Options: own in-app beard, elvs only, trust the pack pages, defer. Deferred by the user | 2.7b |
| D6 | Bone roll stability: tail and roll only, or Procrustes roll correction if roll flips across shapes (`docs/anny-notes.md` section 5) | 1.1 review |

## 11. Risks

- **Download size:** morph pack 17.6 MB today; face modifiers and facial actions add more. Mitigate
  with lazy loading per section and compressed transfer.
- **Skinning quality** at shoulders, hips and hands with MakeHuman weights; Phase 1.6 measures it.
- **Mesh resolution** for close-up portraits; Phase 2.8 decides.
- **License drift:** every new asset needs a source note and license check before vendoring.
