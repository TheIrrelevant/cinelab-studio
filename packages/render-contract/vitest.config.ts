/**
 * @file vitest.config.ts
 * @description Vitest project for @cinelab/render-contract using the shared workspace test setup.
 * @scope cinelab-studio
 * @depends ../../vitest.shared.ts
 */

import { defineProject, mergeConfig } from "vitest/config";
import shared from "../../vitest.shared";

export default mergeConfig(shared, defineProject({ test: { name: "render-contract" } }));
