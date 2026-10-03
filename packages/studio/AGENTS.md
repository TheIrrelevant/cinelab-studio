---
type: agent-guide
description: "@cinelab/studio - 3D studio scene, cameras, lights, framing and studio UI."
last-updated: 2026-10-03
depends_on: [../core/AGENTS.md, ../human/AGENTS.md, ../character/AGENTS.md]
---

# @cinelab/studio

The interactive photo studio and its scene model. It must not import `@cinelab/render-contract`;
the app injects extra panels through `Studio`'s `scenePanel` prop.

- **Public API:** `./components/Studio` (Studio, ScenePanel, STUDIO_CHARACTER_PARAM), `./scene-storage`,
  `./camera-feed`, `./camera-lenses`, `./camera-rig`, `./framing`, `./light-presets`, `./light-rendering`.
- **Depends on:** core, human, character, react, three, @react-three/fiber, @react-three/drei, zod, next.

| Area | Files |
|---|---|
| Scene model | `scene-storage.ts` (versioned scene schema + read/write) |
| Optics | `camera-lenses.ts`, `camera-rig.ts`, `camera-feed.ts` (HDR feed, thin-lens defocus), `framing.ts` |
| Lighting | `light-rendering.ts` (flash strobe), `light-presets.ts` (Kelvin, key/fill/rim), `color.ts` |
| Studio shell | `components/Studio.tsx` composes `studio/useSceneState`, `useStudioUi`, `useAssetActions`, `StudioHeader`, `StudioToolbar`, `StudioPanels` |
| Selection model | `components/studio/ui-state.ts` - one selection, at most one side panel |
| 3D scene | `components/scene/*` (StudioScene, Cyclorama, navigation, TubeBetween) |
| Lights UI | `components/lights/*` (TripodLight, LightHead, LightSettingsPanel, fields/*) |
| Camera UI | `components/camera/*` (rig, live capture, preview window, settings) |
| Model UI | `components/model/*` (StudioCharacter, ModelPickerPanel, PosePickerPanel) |

Unit tests mock `@react-three/fiber`/`drei`; 3D behaviour is verified by `apps/web/scripts/check-studio.mjs`.

**Tests:** `pnpm --filter @cinelab/studio test`
