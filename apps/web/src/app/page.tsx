/**
 * @file page.tsx
 * @description Cinelab Studio entry point. Opens directly into the interactive 3D studio.
 * @scope cinelab-studio/web
 * @depends StudioScreen.tsx
 */

import { StudioScreen } from "./StudioScreen";

export default function Home() {
  return <StudioScreen />;
}
