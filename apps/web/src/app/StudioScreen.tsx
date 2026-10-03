/**
 * @file StudioScreen.tsx
 * @description Composes the studio with the render contract's Scene JSON panel.
 *   Keeps @cinelab/studio independent of @cinelab/render-contract.
 * @scope cinelab-studio/web
 * @depends @cinelab/studio, @cinelab/render-contract
 */

"use client";

import { Studio, type ScenePanel } from "@cinelab/studio/components/Studio";
import { SceneJsonPanel } from "@cinelab/render-contract/components/SceneJsonPanel";

const sceneJsonPanel: ScenePanel = {
  label: "Scene JSON",
  render: (props) => <SceneJsonPanel {...props} />,
};

export function StudioScreen() {
  return <Studio scenePanel={sceneJsonPanel} />;
}
