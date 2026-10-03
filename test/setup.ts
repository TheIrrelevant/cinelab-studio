/**
 * @file setup.ts
 * @description Vitest global setup: registers jest-dom matchers, async timeouts, and isolates localStorage between tests.
 * @scope cinelab-studio
 * @depends @testing-library/jest-dom, @testing-library/react
 */

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup, configure } from "@testing-library/react";

// Packages run as parallel Vitest projects; on a cold start the first render of a heavy
// component can take seconds. waitFor/findBy still resolve as soon as the condition holds.
configure({ asyncUtilTimeout: 5000 });

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