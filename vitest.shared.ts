/**
 * @file vitest.shared.ts
 * @description Shared Vitest settings for every workspace package: jsdom, React plugin,
 *   global setup, and the Node 25+ webstorage workaround.
 * @scope cinelab-studio
 * @depends test/setup.ts
 */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Node 25+ ships a native localStorage global that shadows jsdom's and is
// undefined without --localstorage-file. Disable it where the flag exists.
const WEBSTORAGE_FLAG = "--no-experimental-webstorage";
const execArgv = process.allowedNodeEnvironmentFlags.has(WEBSTORAGE_FLAG) ? [WEBSTORAGE_FLAG] : [];

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [fileURLToPath(new URL("./test/setup.ts", import.meta.url))],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    execArgv,
  },
});
