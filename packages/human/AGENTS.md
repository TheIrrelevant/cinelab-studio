---
type: agent-guide
description: "@cinelab/human - 3D human figure, its proportions and pose presets."
last-updated: 2026-10-06
depends_on: [../core/AGENTS.md]
---

# @cinelab/human

The 3D human body, independent of characters: it takes proportions and a pose, and renders a figure.
The planned MakeHuman-based body (morph targets + skeleton) belongs here.

- **Public API**
  - `./mannequin-spec` - `MannequinSpec`, `HairShape` (height, girth, shoulders, skin, hair).
  - `./components/Mannequin` - jointed react-three-fiber figure for a spec and pose.
  - `./poses` - `POSE_IDS`, `POSES`, `poseAngles(pose)` (joint Euler angles in degrees).
  - `./components/MakeHumanBody` - r3f MakeHuman body for `BodyParams` + `Appearance` (`baseUrl` = converter output folder, `onCatalog` lists choices, `pose` clamped to joint limits, `handles` (on-body joint handles: `fingers`, `selected`, `onSelect(bone, additive)`, `onHover`), `rootOffset`, `gizmo` (`PoseGizmoProps`), `ikTarget`, `onBody`, `showBoneAxes`).
  - `./components/IkTargetGizmo` - world move gizmo for an IK target (`position`, `onMove`).
  - `./makehuman/limbs` - `LIMBS`, `LimbId`, `limbOfEffector`, `limbBones`.
  - `./makehuman/pose-ik` - `settleIk(rig, editor, changedBones)`, `effectorPosition`, `applySnapshot`, `PoseRig`.
  - `./makehuman/load-body` - `LoadedBody` (also passed to `onBody` of `MakeHumanBody`).
  - `./makehuman/shape-model` - `ShapeParams` (BodyParams + `cupSize`, `firmness`, `modifiers` by id, `bodyType`), `DEFAULT_SHAPE`, `shapeTargetWeights`, `breastTargetWeights`, `modifierTargetWeights`.
  - `./makehuman/modifier-catalogue` - `Modifier`, `HEAD_GROUPS`, `buildCatalogue`.
  - `./makehuman/qa-poses` - `QA_POSES` deformation QA pose set (plan 1.6).
  - `./components/PoseGizmo` - drei TransformControls on a bone: rotate clamped to limits, move the root (world axes); `GizmoMode`, `GizmoSpace`.
  - `./makehuman/pose-editor` - pure pose editor (selection, clamped rotations, root offset, undo/redo snapshots, resets, presets).
  - `./makehuman/pose-numeric` - pose delta <-> X/Y/Z degrees (swing X, twist Y, swing Z).
  - `./makehuman/joint-limits` - `jointLimit`, `clampBoneDelta`.
  - `./components/JointHandles` - the handles on their own (`skeleton`, `boneNames`, same options).
  - `./makehuman/body-pose` - `BodyPose` (rig bone name -> rotation delta), `applyBodyPose`, `limitDemoPose`.
  - `./makehuman/appearance` - `Appearance`, `DEFAULT_APPEARANCE`, `HAIR_COLOURS`, `AppearanceCatalog`, `skinWeights`.
  - `./makehuman/anthropometry` - `BodyMeasurements`, `measureTopology(data, index)`, `measureShape`, `measureBody`, `sizeMeasurer` (plan 2.3: height, mass = volume x 980, waist, BMI).
  - `./makehuman/body-solver` - `solveBody(base, { heightCm, massKg }, measure)`: typed cm/kg -> `height`/`weight` params, clamped, with feasible ranges.
  - `./makehuman/body-types` - `BODY_TYPE_IDS`, `BODY_TYPES`, `BodyTypeChoice` (`ShapeParams.bodyType`), `withBodyType`, `switchBodyType(params, choice, keep, measure)` (plan 2.4).
  - `./makehuman/macro` - `BodyParams`, `DEFAULT_BODY`, `MIN_AGE_YEARS`/`MAX_AGE_YEARS` (18/35), `macroTargetWeights`, `ageToMacro`.
- **Depends on:** core, react, three, @react-three/fiber, @react-three/drei (gizmo).
- **Age:** 18-35 years (product decision 2026-10-04). MakeHuman has no adult data below 25, so
  18-25 uses the 25-year body unchanged; 25-35 blends up to about 15 % towards the 90-year targets.
- **Must not know:** characters, studio or rendering.
- **Skinning:** linear blend skinning (MakeHuman weights). Dual quaternion skinning and weight
  smoothing were tried in plan 1.6 and rejected - see docs/deformation-qa.md.
- **Known asset limits:** MakeHuman stock skins have a lighter painted patch around mouth/chin
  that shows as a soft band on one cheek; eye whites read slightly dark under studio lights.

| File | Purpose |
|---|---|
| `src/mannequin-spec.ts` | Spec types |
| `src/components/Mannequin.tsx` | Limbs, hair and the jointed figure |
| `src/poses.ts` | Pose presets |
| `src/three-jsx.d.ts` | r3f JSX element types |
| `src/makehuman/target-file.ts` | Parses MakeHuman `.target` text into sparse offsets |
| `src/makehuman/assets.test.ts` | Integrity checks for the vendored assets |
| `src/makehuman/macro.ts` | Body params -> macro target weights (own implementation of macro.json ranges) |
| `src/makehuman/morph-manifest.ts` | Morph pack manifest types (converter + runtime) |
| `src/makehuman/morph-data.ts` | Reads the morph pack (+ modifier pack via `addModifierPack`; per-target scale); CPU morph + regrounding |
| `src/makehuman/body-shape.ts` | Applies params to the skinned mesh; refits skeleton with head/tail/roll rest frames, keeps pose deltas |
| `src/makehuman/bone-frames.ts` | Blender head/tail/roll bone basis in Y-up axes; pose delta on top of the rest frame (`bonePoseDelta`, `setBonePoseDelta`) |
| `src/makehuman/bone-axes.ts` | Debug overlay: RGB axes on every bone |
| `src/makehuman/swing-twist.ts` | Bone-local rotation <-> swing vector (X/Z) + twist (Y) |
| `src/makehuman/joint-limits.ts` | Limit table (degrees, left side, right mirrored) per posable bone, `jointLimit`, `clampBoneDelta` |
| `src/makehuman/body-pose.ts` | Applies a clamped pose to the skeleton; limit demo pose |
| `src/makehuman/handle-spec.ts` | Handle per posable bone: side/finger colour, IK triangle, size, finger toggle |
| `src/components/JointHandles.tsx` | Handles portalled into bones; on top of the mesh, hover, select |
| `src/components/PoseGizmo.tsx` | Rotate/move gizmo on the primary bone, clamped while dragging |
| `src/makehuman/pose-editor.ts` | Pose editor state: selection, history, resets |
| `src/makehuman/pose-numeric.ts` | Numeric X/Y/Z degrees of a pose delta |
| `src/makehuman/limbs.ts` | The four IK limbs (upper, hinge, effector, fallback bend) |
| `src/makehuman/ik-solver.ts` | Exact analytic two-bone IK around the real hinge, pole, flat end effector |
| `src/makehuman/pose-ik.ts` | Re-solves IK limbs after edits (planted feet) and writes rotations |
| `src/components/IkTargetGizmo.tsx` | Move gizmo for an IK target |
| `src/makehuman/qa-poses.ts` | Deformation QA pose set |
| `src/makehuman/shape-model.ts` | Shape model v2: macros + breast cup/firmness + ReLU local modifiers |
| `src/makehuman/anthropometry.ts` | Height, closed-mesh volume and mass, natural waist, BMI on morphed source positions |
| `src/makehuman/mesh-slice.ts` | Horizontal mesh cross-section loops, area, convex hull girth |
| `src/makehuman/body-solver.ts` | cm/kg -> height/weight parameters (bracketed roots), clamping, ranges |
| `src/makehuman/body-types.ts` | Seven body types as offsets x intensity; type switch keeps cm/kg |
| `src/makehuman/modifier-catalogue.ts` | target.json -> body/head modifier catalogue (bipolar/unipolar, sides, labels) |
| `src/makehuman/convert/modifier-pack.ts` | Modifier pack: catalogue targets + breast macros, same source indexing |
| `scripts/modifier-inputs.ts` | Loads target.json and the vendored modifier targets for the converter |
| `src/makehuman/deformation-metrics.ts` | Collapsed / inverted triangle metrics of a posed mesh |
| `src/makehuman/deformation-qa.test.ts` | Regression guard against the docs/deformation-qa.md baseline |
| `src/makehuman/joint-directions.test.ts` | Limits bend joints anatomically on both sides; right frames mirror left |
| `src/makehuman/skeleton-frames.test.ts` | Plan 1.1 acceptance: local Y on the tail within 1 degree on five shapes, rest pose within 0.1 mm |
| `src/makehuman/load-body.ts` | Fetches and parses GLB + morph pack |
| `src/components/MakeHumanBody.tsx` | r3f component |
| `src/makehuman/appearance.ts` | Appearance model, hair colours, skin blend weights, tone |
| `src/makehuman/body-controller.ts` | Browser driver: shape, skin, eyes, hair/eyebrow/eyelash proxies |
| `src/makehuman/materials.ts` | Skin canvas compositor, eye/hair/eyebrow/eyelash materials, texture cache |
| `src/makehuman/proxy-data.ts` | Reads proxy pack; creates and re-fits proxy SkinnedMeshes |
| `src/makehuman/normals.ts` | Seam-free smooth normals (converter and runtime) |
| `src/makehuman/convert/obj-mesh.ts` | OBJ parse, triangulation, UV-seam split |
| `src/makehuman/convert/rig-refs.ts` | Rig JSON -> parent-first bones with joint vertex lists |
| `src/makehuman/convert/skin-weights.ts` | Top-4 normalised JOINTS_0/WEIGHTS_0 |
| `src/makehuman/convert/morph-pack.ts` | Targets -> Uint16 indices + Int16 deltas (one scale) |
| `src/makehuman/convert/glb-writer.ts` | Minimal skinned GLB writer |
| `src/makehuman/convert/binary-builder.ts` | 4-byte aligned binary sections |
| `src/makehuman/convert/mhclo.ts` | Parses proxy fitting files |
| `src/makehuman/convert/proxy-pack.ts` | Proxies -> fitting data, UV-split mesh, blended skin weights |
| `src/makehuman/proxy-fit.ts` | Places proxy vertices on a (morphed) body (converter + runtime) |
| `src/makehuman/proxy-manifest.ts` | Proxy pack manifest types |
| `scripts/system-inputs.ts` | Loads system assets for the converter, lists textures to copy |
| `src/makehuman/convert/build.ts` | Pipeline: GLB + morph pack + manifest |
| `scripts/build-assets.ts` | CLI for the pipeline (`pnpm human:build`) |
| `assets/makehuman-system/` | MakeHuman system asset pack subset (CC0): skins, eyes, eyebrows, eyelashes, hair (see `SOURCE.md`) |
| `src/makehuman/system-assets.test.ts` | Integrity checks for the system assets |
| `assets/makehuman/` | MakeHuman CC0 data (see `SOURCE.md`); not bundled, input for the GLB converter |

**MakeHuman assets:** vendored once by `node tools/vendor-makehuman.mjs` (pinned mpfb2 commit).
Data only - mpfb2 code is GPL and must never be copied. Adult targets only (young/old, 192
files; no baby or child targets). Four `universal-*-averagemuscle-averageweight` targets are
empty upstream (neutral body).

**System assets:** vendored once by `node tools/vendor-makehuman-system.mjs` (checksum-pinned
CC0 asset pack, resized with sharp). Young skins only (18-35 product range). Hair and eyebrow
textures are greyscale + alpha so the runtime tints them. Proxies keep their `.mhclo` fitting
files (rows are `v1 v2 v3 w1 w2 w3 dx dy dz` or a single vertex index).

**Converter:** `pnpm human:build` writes `makehuman-base.glb` (skinned base body, metres,
grounded, 163 bones, identity bone rotations until the first runtime refit), `makehuman-morphs.bin` and `.json` to
`apps/web/public/human/` (gitignored), plus `makehuman-proxies.bin/.json` (27 proxies fitted to
source vertices) and textures under `proxies/`, `eyes/`, `skins/`, and `makehuman-modifiers.bin/.json` (plan 2.1: 200
modifiers - 83 body, 117 head - plus 144 breast cup/firmness macros; 5.1 MB raw, 1.4 MB gzip; budget
6 MB raw / 1.6 MB gzip, checked in build.test.ts; separate from the 17.6 MB morph pack so it can be
lazy-loaded). Proxy .obj positions were
authored on other bodies (hair is offset by up to 1 dm); only the .mhclo fit is authoritative. Morphing is done on the CPU: positions = source
positions + sum(weight * delta); bones are re-derived from their joint vertex lists; rest rotations come from head, tail and the
rig's Blender roll (computed in Blender Z-up axes, ours = Blender (x, -z, y)). Bone `quaternion` =
`userData.restQuaternion` * pose delta; pose code must use `setBonePoseDelta`. Converter
files import with `.ts` extensions so Node runs them with built-in type stripping; they must not
be imported by browser code. GLTFLoader strips dots from bone names (`pelvis.L` -> `pelvisL`).

**Tests:** `pnpm --filter @cinelab/human test`
