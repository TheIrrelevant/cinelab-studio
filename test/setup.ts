/**
 * @file setup.ts
 * @description Vitest global setup: registers jest-dom matchers and isolates localStorage between tests.
 * @scope cinelab-studio
 */

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  // jsdom provides localStorage, but clear it between tests for isolation.
  window.localStorage.clear();
});

// jsdom lacks matchMedia; stub it for components that query it.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}