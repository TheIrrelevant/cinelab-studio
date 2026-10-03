/**
 * @file render-errors.ts
 * @description Render error codes, retryability and the render error schema/factory.
 * @scope cinelab-studio
 * @depends zod
 */

import { z } from "zod";

export const RENDER_ERROR_CODES = [
  "invalid_request",
  "provider_unavailable",
  "rate_limited",
  "content_rejected",
  "timeout",
  "internal",
] as const;
export type RenderErrorCode = (typeof RENDER_ERROR_CODES)[number];

const RETRYABLE: Record<RenderErrorCode, boolean> = {
  invalid_request: false,
  provider_unavailable: true,
  rate_limited: true,
  content_rejected: false,
  timeout: true,
  internal: true,
};

export const renderErrorSchema = z.object({
  code: z.enum(RENDER_ERROR_CODES),
  /** Human-readable, actionable message shown to the user. */
  message: z.string().min(1),
  retryable: z.boolean(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type RenderError = z.infer<typeof renderErrorSchema>;

export function renderError(code: RenderErrorCode, message: string, details?: Record<string, unknown>): RenderError {
  return { code, message, retryable: RETRYABLE[code], ...(details ? { details } : {}) };
}
