---
type: agent-guide
description: "@cinelab/human - 3D human figure, its proportions and pose presets."
last-updated: 2026-10-03
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

**Tests:** `pnpm --filter @cinelab/human test`
