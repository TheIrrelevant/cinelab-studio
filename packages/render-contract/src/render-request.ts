/**
 * @file render-request.ts
 * @description Render kinds, output sizes and the render request schema.
 * @scope cinelab-studio
 * @depends zod, scene-json-schema
 */

import { z } from "zod";
import { sceneJsonSchema } from "./scene-json-schema";

export const RENDER_KINDS = ["preview", "final"] as const;
export type RenderKind = (typeof RENDER_KINDS)[number];

export const RENDER_OUTPUT_SIZES: Record<RenderKind, { width: number; height: number }> = {
  preview: { width: 1024, height: 576 },
  final: { width: 3840, height: 2160 },
};

export const renderRequestSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  kind: z.enum(RENDER_KINDS),
  scene: sceneJsonSchema,
  /** SHA-256 of the canonical scene JSON; identical scenes share a hash. */
  sceneHash: z.string().regex(/^[0-9a-f]{64}$/),
  output: z.object({ width: z.number().int().positive(), height: z.number().int().positive(), aspectRatio: z.literal("16:9") }),
  seed: z.number().int().nonnegative().nullable(),
});

export type RenderRequest = z.infer<typeof renderRequestSchema>;
