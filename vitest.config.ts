/**
 * @file vitest.config.ts
 * @description Vitest configuration with jsdom environment for component and unit tests.
 * @scope cinelab-studio
 */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Node 25+ ships a native localStorage global that shadows jsdom's and is
// undefined without --localstorage-file. Disable it where the flag exists.
const WEBSTORAGE_FLAG = "--no-experimental-webstorage";
const execArgv = process.allowedNodeEnvironmentFlags.has(WEBSTORAGE_FLAG) ? [WEBSTORAGE_FLAG] : [];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    execArgv,
  },
});