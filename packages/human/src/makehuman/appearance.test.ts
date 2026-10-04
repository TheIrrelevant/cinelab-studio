/**
 * @file appearance.test.ts
 * @description Tests skin blend weights, skin tone factor, the appearance catalog, and runtime
 *   proxies on the real body: a re-shaped body carries fitted, correctly skinned hair.
 * @scope cinelab-studio
 * @depends ./appearance, ./proxy-data, ./body-shape, ./load-body, ../../scripts/build-assets.ts
 */

import { describe, expect, it } from "vitest";
import { MeshBasicMaterial, Vector3 } from "three";
import { buildAssets } from "../../scripts/build-assets.ts";
import { appearanceCatalog, DEFAULT_APPEARANCE, skinToneFactor, skinWeights } from "./appearance";
import { applyBodyShape } from "./body-shape";
import { parseBody } from "./load-body";
import { DEFAULT_BODY } from "./macro";
import { createProxyMesh, fitProxyMesh, proxyKey } from "./proxy-data";

describe("skinWeights", () => {
  it("matches ethnicity share times gender and sums to 1", () => {
    const weights = skinWeights({ ...DEFAULT_BODY, gender: 0.25, african: 2, asian: 0, caucasian: 2 });
    expect(weights.get("african-female")).toBeCloseTo(0.375);
    expect(weights.get("caucasian-male")).toBeCloseTo(0.125);
    expect(weights.has("asian-female")).toBe(false);
    expect([...weights.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("uses only one gender's skins at the extremes", () => {
    expect([...skinWeights({ ...DEFAULT_BODY, gender: 1 }).keys()].every((name) => name.endsWith("-male"))).toBe(true);
  });
});

describe("skinToneFactor", () => {
  it("is 1 at the middle and monotonic from darker to lighter", () => {
    expect(skinToneFactor(0.5)).toBe(1);
    expect(skinToneFactor(0)).toBeCloseTo(0.55);
    expect(skinToneFactor(1)).toBeCloseTo(1.3);
    expect(skinToneFactor(0.25)).toBeLessThan(skinToneFactor(0.75));
  });
});

describe("runtime proxies", () => {
  const built = buildAssets();
  const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

  it("lists the generated choices and contains the default appearance", () => {
    const catalog = appearanceCatalog(built.proxyManifest);
    expect(catalog.hair).toHaveLength(10);
    expect(catalog.eyebrows).toHaveLength(12);
    expect(catalog.hair).toContain(DEFAULT_APPEARANCE.hair);
    expect(catalog.eyebrows).toContain(DEFAULT_APPEARANCE.eyebrows);
    expect(catalog.eyelashes).toContain(DEFAULT_APPEARANCE.eyelashes);
    expect(catalog.eyeColours).toContain(DEFAULT_APPEARANCE.eyeColour);
  });

  it("fits hair to a re-shaped body and skins it to the same rest pose", async () => {
    const body = await parseBody({
      glb: buffer(built.glb),
      manifest: built.manifest,
      morphs: buffer(built.morphBin),
      proxyManifest: built.proxyManifest,
      proxies: buffer(built.proxyBin),
    });
    const data = body.proxies.get(proxyKey("hair", "long01"))!;
    const hair = createProxyMesh(data, body.mesh.skeleton, body.mesh.bindMatrix, new MeshBasicMaterial());
    body.scene.add(hair);
    const tall = applyBodyShape(body.mesh, body.data, { ...DEFAULT_BODY, gender: 1, height: 1 });
    fitProxyMesh(hair, data, tall.source);
    hair.bind(body.mesh.skeleton, body.mesh.bindMatrix);
    const position = hair.geometry.getAttribute("position");
    let top = 0;
    for (let i = 0; i < position.count; i += 1) top = Math.max(top, position.getY(i));
    expect(top).toBeGreaterThan(tall.heightMetres - 0.05);
    expect(top).toBeLessThan(tall.heightMetres + 0.1);
    body.mesh.skeleton.update();
    for (const i of [0, 100, position.count - 1]) {
      const rest = new Vector3().fromBufferAttribute(position, i);
      expect(hair.applyBoneTransform(i, rest.clone()).distanceTo(rest), `vertex ${i}`).toBeLessThan(1e-4);
    }
  }, 60_000);
});
