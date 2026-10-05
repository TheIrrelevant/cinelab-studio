/**
 * @file deformation-qa.test.ts
 * @description Plan 1.6 regression guard: every QA pose stays inside the joint limits and its
 *   linear blend skinning deformation stays at or below the measured 2026-10-05 baseline
 *   (collapsed = area under 20 % of rest, inverted = normal flipped against its bone), see
 *   docs/deformation-qa.md. A rise means a weight, limit or rig change made deformation worse.
 * @scope cinelab-studio
 * @depends ./qa-poses, ./deformation-metrics, ./body-pose, ./joint-limits, ./load-body
 */

import { beforeAll, describe, expect, it } from "vitest";
import { buildAssets } from "../../scripts/build-assets.ts";
import { applyBodyPose } from "./body-pose";
import { applyBodyShape } from "./body-shape";
import { deformationStats, skinnedPositions } from "./deformation-metrics";
import { clampBoneDelta } from "./joint-limits";
import { parseBody, type LoadedBody } from "./load-body";
import { DEFAULT_BODY } from "./macro";
import { QA_POSES, type QaPoseId } from "./qa-poses";

let body: LoadedBody;
const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

beforeAll(async () => {
  const built = buildAssets();
  body = await parseBody({ glb: buffer(built.glb), manifest: built.manifest, morphs: buffer(built.morphBin), proxyManifest: built.proxyManifest, proxies: buffer(built.proxyBin) });
  applyBodyShape(body.mesh, body.data, DEFAULT_BODY);
}, 60_000);

/** Baseline on the default body (collapsed, inverted triangles out of 26,756). */
const BASELINE: Record<QaPoseId, { collapsed: number; inverted: number }> = {
  "arms-up": { collapsed: 26, inverted: 118 },
  "elbows-140": { collapsed: 12, inverted: 54 },
  "deep-squat": { collapsed: 35, inverted: 135 },
  fists: { collapsed: 118, inverted: 276 },
  "head-turn": { collapsed: 4, inverted: 6 },
  "jaw-open": { collapsed: 1, inverted: 18 },
};

describe("deformation QA (plan 1.6)", () => {
  for (const qa of QA_POSES) {
    it(`${qa.label}: inside the joint limits and no worse than the baseline`, () => {
      for (const [bone, q] of Object.entries(qa.pose)) expect(clampBoneDelta(bone, q).angleTo(q), bone).toBeLessThan(1e-6);
      applyBodyPose(body.mesh.skeleton, body.data.manifest.bones, qa.pose, qa.rootOffset);
      const stats = deformationStats(body.mesh, skinnedPositions(body.mesh), body.data.manifest.bones.map((b) => b.name));
      expect(stats.collapsed).toBeLessThanOrEqual(BASELINE[qa.id].collapsed);
      expect(stats.inverted).toBeLessThanOrEqual(BASELINE[qa.id].inverted);
      // Under 1.5 % of the triangles are affected in any pose (fists are the worst at 1.47 %).
      expect((stats.collapsed + stats.inverted) / stats.triangles).toBeLessThan(0.015);
    });
  }
});
