/**
 * @file face-units.test.ts
 * @description Plan 3.1 facial actions on the real converted assets: every unit is packed, moves only
 *   the head and its own region (brows, eyes, lower face) and side, left/right units mirror, all
 *   units combined stay stable, expressions leave the skeleton source and measurements unchanged, and
 *   eye look turns the eye bones the right way inside their joint limits.
 * @scope cinelab-studio
 * @depends ./face-units, ./eye-look, ./body-shape, ./load-body, ../../scripts/build-assets.ts
 */

import { beforeAll, describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { buildAssets } from "../../scripts/build-assets.ts";
import { applyBodyShape } from "./body-shape";
import { eyeLookPose } from "./eye-look";
import { EYE_LOOK_DEGREES, FACE_GROUPS, FACE_UNIT_IDS, eyeLookAngles, faceUnitTarget, faceUnitWeights } from "./face-units";
import { clampBoneDelta } from "./joint-limits";
import { parseBody, type LoadedBody } from "./load-body";
import { jointPosition } from "./morph-data";
import { DEFAULT_SHAPE } from "./shape-model";

let body: LoadedBody;
let source: Float32Array;
let eyeY: number;
const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

beforeAll(async () => {
  const built = buildAssets();
  body = await parseBody({
    glb: buffer(built.glb), manifest: built.manifest, morphs: buffer(built.morphBin), proxyManifest: built.proxyManifest,
    proxies: buffer(built.proxyBin), modifierManifest: built.modifiers!.manifest, modifiers: buffer(built.modifiers!.bin),
  });
  source = applyBodyShape(body.mesh, body.data, DEFAULT_SHAPE).source;
  eyeY = jointPosition(source, body.data.manifest.bones.find((b) => b.name === "eye.L")!.head)[1];
}, 60_000);

/** Displaced source vertices (> 0.3 mm) of a unit: position and displacement length. */
function displaced(id: string) {
  const target = body.data.targets.get(faceUnitTarget(id))!;
  const out: Array<{ x: number; y: number; d: number }> = [];
  for (let i = 0; i < target.indices.length; i += 1) {
    const d = Math.hypot(target.deltas[i * 3], target.deltas[i * 3 + 1], target.deltas[i * 3 + 2]) * target.scale;
    const v = target.indices[i];
    if (d > 0.0003) out.push({ x: source[v * 3], y: source[v * 3 + 1] - eyeY, d });
  }
  return out;
}

/** Allowed height band relative to the eye joints, per group (metres). */
const BAND: Record<string, [number, number]> = { brows: [-0.04, 0.08], eyes: [-0.055, 0.02], cheeks: [-0.11, 0.065], jaw: [-0.16, 0.02], mouth: [-0.16, 0.02] };

describe("facial actions (plan 3.1)", () => {
  it("packs all 51 units and rejects unknown ids", () => {
    expect(FACE_UNIT_IDS).toHaveLength(51);
    for (const id of FACE_UNIT_IDS) expect(body.data.targets.has(faceUnitTarget(id)), id).toBe(true);
    expect(() => faceUnitWeights({ tongueOut: 1 })).toThrow(/Unknown/);
    expect([...faceUnitWeights({ jawOpen: 1.4, eyeBlinkLeft: 0 })]).toEqual([["faceunits/jawOpen", 1]]);
  });

  it("moves only the head, inside its own region and side", () => {
    for (const group of FACE_GROUPS) {
      for (const unit of group.units) {
        const moved = displaced(unit.id);
        expect(moved.length, unit.id).toBeGreaterThan(100);
        const ys = moved.map((m) => m.y);
        expect(Math.min(...ys), unit.id).toBeGreaterThanOrEqual(BAND[group.id][0]);
        expect(Math.max(...ys), unit.id).toBeLessThanOrEqual(BAND[group.id][1]);
        const side = unit.label.endsWith(" left") ? 1 : unit.label.endsWith(" right") ? -1 : 0;
        if (!side) continue;
        const total = moved.reduce((sum, m) => sum + m.d, 0);
        const own = moved.filter((m) => m.x * side > -0.002).reduce((sum, m) => sum + m.d, 0);
        // A symmetric unit gives 0.5; one-sided lower-lip pulls reach over the midline (0.76).
        expect(own / total, unit.id).toBeGreaterThan(0.75);
      }
    }
  });

  it("mirrors left and right units", () => {
    for (const id of FACE_UNIT_IDS.filter((u) => u.endsWith("Left") && FACE_UNIT_IDS.includes(u.replace(/Left$/, "Right")))) {
      if (id === "jawLeft" || id === "mouthLeft") continue; // directions, not sides
      const left = displaced(id);
      const right = displaced(id.replace(/Left$/, "Right"));
      expect(Math.abs(left.length - right.length) / left.length, id).toBeLessThan(0.03);
      const sum = (list: typeof left) => list.reduce((s, m) => s + m.x * m.d, 0);
      expect(sum(left) + sum(right), id).toBeCloseTo(0, 2);
    }
  });

  it("stays stable with every unit at full strength", () => {
    const all = Object.fromEntries(FACE_UNIT_IDS.map((id) => [id, 1]));
    const result = applyBodyShape(body.mesh, body.data, DEFAULT_SHAPE, all);
    let worst = 0;
    for (let i = 0; i < result.surface.length; i += 1) {
      expect(Number.isFinite(result.surface[i])).toBe(true);
      worst = Math.max(worst, Math.abs(result.surface[i] - source[i]));
    }
    expect(worst).toBeLessThan(0.06);
    expect(result.source).toEqual(source);
    applyBodyShape(body.mesh, body.data, DEFAULT_SHAPE);
  });

  it("turns the eyes towards +x and up inside the joint limits", () => {
    const { skeleton } = body.mesh;
    const names = body.data.manifest.bones.map((b) => b.name);
    const eye = skeleton.bones[names.indexOf("eye.L")];
    const forward = () => new Vector3(0, 1, 0).applyQuaternion(eye.getWorldQuaternion(eye.quaternion.clone()));
    eye.updateWorldMatrix(true, false);
    const rest = forward();
    const pose = eyeLookPose(skeleton, names, eyeLookAngles({ eyeLookOutLeft: 1, eyeLookUpLeft: 1 }));
    // Combined yaw and pitch carry a little twist; the joint limit removes it (as applyBodyPose does).
    const delta = clampBoneDelta("eye.L", pose["eye.L"]);
    expect(delta.angleTo(pose["eye.L"])).toBeLessThan(4 * (Math.PI / 180));
    eye.quaternion.multiply(delta);
    eye.updateWorldMatrix(true, false);
    const turned = forward();
    expect(turned.x).toBeGreaterThan(rest.x + 0.3);
    expect(turned.y).toBeGreaterThan(rest.y + 0.25);
    expect(eyeLookAngles({ eyeLookInRight: 1 }).right.yaw).toBe(EYE_LOOK_DEGREES.horizontal);
    eye.quaternion.multiply(delta.clone().invert());
  });
});
