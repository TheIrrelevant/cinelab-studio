/**
 * @file contract.test.ts
 * @description Tests the render status lifecycle, error model and result invariants.
 * @scope cinelab-studio
 * @depends contract.ts
 */

import { describe, expect, it } from "vitest";
import { canTransition, isTerminal, renderError, renderResultSchema, RENDER_STATUSES } from "./contract";

const base = {
  requestId: "render-1",
  status: "queued" as const,
  provider: null,
  outputs: [],
  error: null,
  queuedAt: "2026-10-03T12:00:00.000Z",
  startedAt: null,
  completedAt: null,
};

describe("render status lifecycle", () => {
  it("moves forward only and stops at terminal states", () => {
    expect(canTransition("queued", "running")).toBe(true);
    expect(canTransition("running", "succeeded")).toBe(true);
    expect(canTransition("queued", "succeeded")).toBe(false);
    expect(canTransition("succeeded", "running")).toBe(false);
    expect(RENDER_STATUSES.filter(isTerminal)).toEqual(["succeeded", "failed", "cancelled"]);
  });
});

describe("render errors", () => {
  it("marks transient failures retryable", () => {
    expect(renderError("rate_limited", "Too many requests, try again in a minute.").retryable).toBe(true);
    expect(renderError("content_rejected", "The provider declined this scene.").retryable).toBe(false);
    expect(renderError("timeout", "Timed out", { seconds: 120 })).toMatchObject({ details: { seconds: 120 } });
  });
});

describe("render results", () => {
  it("requires an error exactly when failed", () => {
    expect(renderResultSchema.safeParse(base).success).toBe(true);
    expect(renderResultSchema.safeParse({ ...base, status: "failed" }).success).toBe(false);
    expect(renderResultSchema.safeParse({ ...base, status: "failed", error: renderError("internal", "Provider crashed.") }).success).toBe(true);
    expect(renderResultSchema.safeParse({ ...base, error: renderError("internal", "x") }).success).toBe(false);
  });

  it("only allows outputs on success", () => {
    const output = { uri: "asset-1", width: 1024, height: 576, mimeType: "image/png" };
    expect(renderResultSchema.safeParse({ ...base, outputs: [output] }).success).toBe(false);
    expect(renderResultSchema.safeParse({ ...base, status: "succeeded", outputs: [output] }).success).toBe(true);
  });
});
