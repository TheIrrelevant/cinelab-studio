/**
 * @file QaPoseSelect.tsx
 * @description Deformation QA pose picker for the human lab (plan 1.6): loads one of the fixed QA
 *   poses into the pose editor, or returns to rest.
 * @scope cinelab-studio/web
 * @depends @cinelab/human/makehuman/qa-poses
 */

"use client";

import { QA_POSES, type QaPose } from "@cinelab/human/makehuman/qa-poses";

export function QaPoseSelect({ onLoad, onRest }: { onLoad: (qa: QaPose) => void; onRest: () => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-neutral-400">
      QA pose
      <select
        data-testid="select-qa-pose"
        defaultValue=""
        onChange={(event) => {
          const qa = QA_POSES.find((p) => p.id === event.currentTarget.value);
          if (qa) onLoad(qa);
          else onRest();
        }}
        className="flex-1 rounded bg-neutral-900 px-1 py-0.5 text-neutral-100"
      >
        <option value="">Rest</option>
        {QA_POSES.map((qa) => (
          <option key={qa.id} value={qa.id}>
            {qa.label}
          </option>
        ))}
      </select>
    </label>
  );
}
