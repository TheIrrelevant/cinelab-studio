/**
 * @file PosePickerPanel.tsx
 * @description Side panel with the mannequin pose presets.
 * @scope cinelab-studio
 * @depends @cinelab/human/poses, panel-styles
 */

"use client";

import { POSE_IDS, POSES, type PoseId } from "@cinelab/human/poses";
import { RIGHT_PANEL_CLASS } from "../panel-styles";

export function PosePickerPanel({
  pose,
  characterName,
  onPick,
  onClose,
}: {
  pose: PoseId;
  characterName: string;
  onPick: (pose: PoseId) => void;
  onClose: () => void;
}) {
  return (
    <aside
      aria-label="Choose a pose"
      className={RIGHT_PANEL_CLASS}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">{characterName}</p>
          <h2 className="mt-1 text-sm font-medium">Pose</h2>
        </div>
        <button type="button" aria-label="Close pose picker" onClick={onClose} className="h-8 w-8 rounded-full text-white/50 hover:bg-white/10 hover:text-white">×</button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {POSE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={pose === id}
            onClick={() => onPick(id)}
            className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
              pose === id ? "border-amber-300/60 bg-amber-300/10 text-white" : "border-white/10 text-white/65 hover:border-white/25"
            }`}
          >
            {POSES[id].label}
          </button>
        ))}
      </div>
    </aside>
  );
}
