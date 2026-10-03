/**
 * @file contract.ts
 * @description Provider-neutral render contract: SceneJSON, render request/result,
 *   status lifecycle and error model. Providers and adapters consume these types;
 *   nothing here names a specific AI service. Thin barrel over the split modules.
 * @scope cinelab-studio
 * @depends scene-json-schema, render-request, render-status, render-errors, render-result
 */

export * from "./scene-json-schema";
export * from "./render-request";
export * from "./render-status";
export * from "./render-errors";
export * from "./render-result";
