---
type: agent-guide
description: "@cinelab/human - 3D human figure, its proportions and pose presets."
last-updated: 2026-10-04
depends_on: [../core/AGENTS.md]
---

# @cinelab/human

The 3D human body, independent of characters: it takes proportions and a pose, and renders a figure.
The planned MakeHuman-based body (morph targets + skeleton) belongs here.

- **Public API**
  - `./mannequin-spec` - `MannequinSpec`, `HairShape` (height, girth, shoulders, skin, hair).
  - `./components/Mannequin` - jointed react-three-fiber figure for a spec and pose.
  - `./poses` - `POSE_IDS`, `POSES`, `poseAngles(pose)` (joint Euler angles in degrees).
  - `./components/MakeHumanBody` - r3f morphable MakeHuman body for `BodyParams` (`baseUrl` = converter output folder).
  - `./makehuman/macro` - `BodyParams`, `DEFAULT_BODY`, `MIN_AGE_YEARS`/`MAX_AGE_YEARS` (18/35), `macroTargetWeights`, `ageToMacro`.
- **Depends on:** core, react, three, @react-three/fiber.
- **Age:** 18-35 years (product decision 2026-10-04). MakeHuman has no adult data below 25, so
  18-25 uses the 25-year body unchanged; 25-35 blends up to about 15 % towards the 90-year targets.
- **Must not know:** characters, studio or rendering.

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
| `src/makehuman/morph-data.ts` | Reads the pack; CPU morph + regrounding |
| `src/makehuman/body-shape.ts` | Applies params to the skinned mesh; refits skeleton, keeps bone rotations |
| `src/makehuman/load-body.ts` | Fetches and parses GLB + morph pack |
| `src/components/MakeHumanBody.tsx` | r3f component |
| `src/makehuman/normals.ts` | Seam-free smooth normals (converter and runtime) |
| `src/makehuman/convert/obj-mesh.ts` | OBJ parse, triangulation, UV-seam split |
| `src/makehuman/convert/rig-refs.ts` | Rig JSON -> parent-first bones with joint vertex lists |
| `src/makehuman/convert/skin-weights.ts` | Top-4 normalised JOINTS_0/WEIGHTS_0 |
| `src/makehuman/convert/morph-pack.ts` | Targets -> Uint16 indices + Int16 deltas (one scale) |
| `src/makehuman/convert/glb-writer.ts` | Minimal skinned GLB writer |
| `src/makehuman/convert/binary-builder.ts` | 4-byte aligned binary sections |
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
grounded, 163 bones, identity bone rotations), `makehuman-morphs.bin` and `.json` to
`apps/web/public/human/` (gitignored). Morphing is done on the CPU: positions = source
positions + sum(weight * delta); bones are re-derived from their joint vertex lists. Converter
files import with `.ts` extensions so Node runs them with built-in type stripping; they must not
be imported by browser code. GLTFLoader strips dots from bone names (`pelvis.L` -> `pelvisL`).

**Tests:** `pnpm --filter @cinelab/human test`
