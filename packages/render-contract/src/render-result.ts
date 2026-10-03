/**
 * @file render-result.ts
 * @description Render output, result and record schemas.
 * @scope cinelab-studio
 * @depends zod, render-request, render-status, render-errors
 */

import { z } from "zod";
import { renderRequestSchema } from "./render-request";
import { RENDER_STATUSES } from "./render-status";
import { renderErrorSchema } from "./render-errors";

export const renderOutputSchema = z.object({
  /** Asset id or URL; storage is up to the pipeline. */
  uri: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  mimeType: z.string().min(1),
});

export const renderResultSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(RENDER_STATUSES),
  /** Filled in by whichever provider ran the request; kept for reproducibility. */
  provider: z.object({ id: z.string(), model: z.string().nullable(), params: z.record(z.string(), z.unknown()) }).nullable(),
  outputs: z.array(renderOutputSchema),
  error: renderErrorSchema.nullable(),
  queuedAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
}).refine((result) => (result.status === "failed") === (result.error !== null), {
  message: "Failed results need an error and only failed results may carry one",
}).refine((result) => result.status === "succeeded" || result.outputs.length === 0, {
  message: "Only succeeded results carry outputs",
});

export type RenderResult = z.infer<typeof renderResultSchema>;

export const renderRecordSchema = z.object({
  request: renderRequestSchema,
  result: renderResultSchema,
});

export type RenderRecord = z.infer<typeof renderRecordSchema>;
