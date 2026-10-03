/**
 * @file vitest.config.ts
 * @description Root Vitest entry: runs every workspace package as a project.
 * @scope cinelab-studio
 * @depends vitest.config.ts of every package and apps/web
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*", "apps/web"],
  },
});
