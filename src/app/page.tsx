/**
 * @file page.tsx
 * @description Cinelab Studio entry point. Opens directly into the interactive 3D studio.
 * @scope cinelab-studio
 * @depends Studio.tsx
 */

import { Studio } from "@/components/studio/Studio";

export default function Home() {
  return <Studio />;
}
