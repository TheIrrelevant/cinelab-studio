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
- **Depends on:** core, react, three, @react-three/fiber.
- **Must not know:** characters, studio or rendering.

| File | Purpose |
|---|---|
| `src/mannequin-spec.ts` | Spec types |
| `src/components/Mannequin.tsx` | Limbs, hair and the jointed figure |
| `src/poses.ts` | Pose presets |
| `src/three-jsx.d.ts` | r3f JSX element types |
| `src/makehuman/target-file.ts` | Parses MakeHuman `.target` text into sparse offsets |
| `src/makehuman/assets.test.ts` | Integrity checks for the vendored assets |
| `assets/makehuman/` | MakeHuman CC0 data (see `SOURCE.md`); not bundled, input for the GLB converter |

**MakeHuman assets:** vendored once by `node tools/vendor-makehuman.mjs` (pinned mpfb2 commit).
Data only - mpfb2 code is GPL and must never be copied. Adult targets only (child/young/old,
no baby); the body is 18+, child targets exist only to interpolate ages 18-25. Six
`universal-*-averagemuscle-averageweight` targets are empty upstream (neutral body).

**Tests:** `pnpm --filter @cinelab/human test`
