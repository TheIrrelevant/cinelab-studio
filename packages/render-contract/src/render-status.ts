/**
 * @file render-status.ts
 * @description Render status lifecycle: statuses, allowed transitions and terminal check.
 * @scope cinelab-studio
 * @depends none
 */

export const RENDER_STATUSES = ["queued", "running", "succeeded", "failed", "cancelled"] as const;
export type RenderStatus = (typeof RENDER_STATUSES)[number];

const TRANSITIONS: Record<RenderStatus, readonly RenderStatus[]> = {
  queued: ["running", "failed", "cancelled"],
  running: ["succeeded", "failed", "cancelled"],
  succeeded: [],
  failed: [],
  cancelled: [],
};

export function canTransition(from: RenderStatus, to: RenderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: RenderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
