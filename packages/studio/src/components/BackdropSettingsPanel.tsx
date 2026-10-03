/**
 * @file BackdropSettingsPanel.tsx
 * @description Settings panel for the seamless backdrop paper colour.
 * @scope cinelab-studio
 * @depends scene-storage, panel-styles
 */

"use client";

import { BACKDROP_COLORS, type StudioBackdrop } from "../scene-storage";
import { RIGHT_PANEL_CLASS } from "./panel-styles";

export function BackdropSettingsPanel({
  backdrop,
  onChange,
  onClose,
}: {
  backdrop: StudioBackdrop;
  onChange: (backdrop: StudioBackdrop) => void;
  onClose: () => void;
}) {
  return (
    <aside
      aria-label="Backdrop settings"
      className={RIGHT_PANEL_CLASS}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Studio</p>
          <h2 className="mt-1 text-sm font-medium">Seamless backdrop</h2>
        </div>
        <button type="button" aria-label="Close backdrop settings" onClick={onClose} className="h-8 w-8 rounded-full text-white/50 hover:bg-white/10 hover:text-white">×</button>
      </div>
      <fieldset>
        <legend className="mb-2 text-xs text-white/55">Paper colour</legend>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(BACKDROP_COLORS) as Array<StudioBackdrop["color"]>).map((color) => (
            <button
              key={color}
              type="button"
              aria-pressed={backdrop.color === color}
              onClick={() => onChange({ color })}
              className={`flex flex-col items-center gap-2 rounded-xl border p-2 text-[11px] capitalize transition ${
                backdrop.color === color ? "border-amber-300/70 text-white" : "border-white/10 text-white/55 hover:border-white/25"
              }`}
            >
              <span aria-hidden="true" className="h-8 w-full rounded-lg border border-white/15" style={{ backgroundColor: BACKDROP_COLORS[color] }} />
              {color}
            </button>
          ))}
        </div>
      </fieldset>
    </aside>
  );
}
