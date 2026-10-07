/**
 * @file page.tsx (characters/new)
 * @description Old form editor route, replaced by the 3D creator (2026-10-07): redirects to
 *   /characters/creator so existing links keep working.
 * @scope cinelab-studio/web
 * @depends next/navigation
 */

import { redirect } from "next/navigation";

export default function NewCharacterPage() {
  redirect("/characters/creator");
}
