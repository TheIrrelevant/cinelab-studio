/**
 * @file panel-styles.ts
 * @description Shared Tailwind classes for the studio's right-hand settings panels.
 *   Height leaves room for the header chips above and the toolbar below.
 * @scope cinelab-studio
 * @depends none
 */

export const RIGHT_PANEL_CLASS =
  "absolute right-5 top-1/2 max-h-[calc(100dvh-11rem)] w-72 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#151617]/95 p-4 shadow-2xl shadow-black/45 backdrop-blur-2xl";
