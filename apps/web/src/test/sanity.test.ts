/**
 * @file sanity.test.ts
 * @description Smoke test confirming vitest + jsdom environment is wired correctly.
 * @scope cinelab-studio
 * @depends vitest
 */

import { describe, it, expect } from "vitest";

describe("vitest sanity", () => {
  it("runs in a jsdom environment with localStorage", () => {
    expect(window).toBeDefined();
    expect(window.localStorage).toBeDefined();
    window.localStorage.setItem("k", "v");
    expect(window.localStorage.getItem("k")).toBe("v");
  });
});