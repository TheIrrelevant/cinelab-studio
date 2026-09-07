/**
 * @file RpmCreator.tsx
 * @description Compatibility boundary for the discontinued Ready Player Me creator; never opens the retired service.
 * @depends https://readyplayer.me/
 */
import type { ComponentType } from "react";

export type RpmCreatorProps = {
  onAvatarExported: (url: string, id?: string) => void;
  onUserSet?: (id: string) => void;
};

// Preserve the planned caller contract without sending users or messages to a retired service.
export const RpmCreator: ComponentType<RpmCreatorProps> = () => (
  <section aria-label="Avatar creator unavailable" className="rounded-xl border border-white/15 bg-neutral-900 p-5 text-white">
    <h2 className="font-semibold">Avatar creator unavailable</h2>
    <p className="mt-2 text-sm text-white/70">
      Ready Player Me discontinued its services on January 31, 2026. New avatars cannot be created with this provider.
    </p>
    <a href="/characters" className="mt-4 inline-block text-sm text-amber-300 underline">Open character library</a>
  </section>
);
