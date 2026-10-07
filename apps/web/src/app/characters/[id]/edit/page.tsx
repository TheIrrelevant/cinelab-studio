/**
 * @file page.tsx (characters/[id]/edit)
 * @description Old form editor route, replaced by the 3D creator (2026-10-07): redirects to the
 *   creator deep link of the character so existing links keep working.
 * @scope cinelab-studio/web
 * @depends next/navigation
 */

import { redirect } from "next/navigation";

export default async function EditCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/characters/creator?id=${encodeURIComponent(id)}`);
}
