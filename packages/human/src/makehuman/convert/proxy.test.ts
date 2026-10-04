/**
 * @file proxy.test.ts
 * @description Tests .mhclo parsing, proxy fitting math, and the packed proxies of the real
 *   assets: eyes land exactly on their mesh, hair sits on the head, skinning is complete.
 * @scope cinelab-studio
 * @depends ./mhclo.ts, ../proxy-fit, ../../../scripts/build-assets.ts
 */

import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildAssets } from "../../../scripts/build-assets.ts";
import { fitProxy } from "../proxy-fit";
import type { PackedProxy } from "../proxy-manifest";
import { parseMhclo } from "./mhclo.ts";
import { parseObj } from "./obj-mesh.ts";

const MHCLO = `# comment
name test
obj_file test.obj
x_scale 0 1 2.0
y_scale 0 2 4.0
z_scale 0 3 1.0
verts 0
material test.mhmat
 0 1 2 0.5 0.25 0.25 1 2 3
3
`;

describe("parseMhclo", () => {
  it("reads header, triangle rows and single-vertex rows", () => {
    const mhclo = parseMhclo(MHCLO);
    expect(mhclo).toMatchObject({ name: "test", objFile: "test.obj", scale: { x: { a: 0, b: 1, length: 2 } } });
    expect(mhclo.refs).toEqual([[0, 1, 2], [3, 3, 3]]);
    expect(mhclo.weights).toEqual([[0.5, 0.25, 0.25], [1, 0, 0]]);
    expect(mhclo.offsets).toEqual([[1, 2, 3], [0, 0, 0]]);
  });

  it("rejects malformed rows and missing headers", () => {
    expect(() => parseMhclo(MHCLO.replace("3\n", "3 4\n"))).toThrow(/Invalid mhclo/);
    expect(() => parseMhclo("name x\nverts 0\n1\n")).toThrow(/Incomplete/);
  });
});

describe("fitProxy", () => {
  it("blends the triangle and scales offsets by the current axis lengths", () => {
    const source = [0, 0, 0, 4, 0, 0, 0, 2, 0, 0, 0, 1];
    const fit = { refs: [0, 1, 2], weights: [0.5, 0.25, 0.25], offsets: [1, 1, 1], scaleRefs: [0, 1, 2, 0, 2, 4, 0, 3, 1] };
    // Scales: x 4/2 = 2, y 2/4 = 0.5, z 1/1 = 1.
    expect(Array.from(fitProxy(source, fit))).toEqual([1 + 2, 0.5 + 0.5, 1]);
  });
});

describe("packed proxies of the vendored assets", () => {
  let built: ReturnType<typeof buildAssets>;
  let source: Float32Array;
  const view = <T>(Type: { new (b: ArrayBuffer, o: number, n: number): T; BYTES_PER_ELEMENT: number }, section: { offset: number; length: number }) =>
    new Type(built.proxyBin.buffer as ArrayBuffer, built.proxyBin.byteOffset + section.offset, section.length / Type.BYTES_PER_ELEMENT);
  const fitOf = (proxy: PackedProxy) =>
    fitProxy(source, { refs: view(Uint16Array, proxy.refs), weights: view(Float32Array, proxy.weights), offsets: view(Float32Array, proxy.offsets), scaleRefs: proxy.scaleRefs });
  const find = (kind: string, name: string) => built.proxyManifest.proxies.find((p) => p.kind === kind && p.name === name)!;

  beforeAll(() => {
    built = buildAssets();
    const { morphBin, manifest } = built;
    source = new Float32Array(morphBin.buffer.slice(morphBin.byteOffset + manifest.sourcePositions.offset, morphBin.byteOffset + manifest.sourcePositions.offset + manifest.sourcePositions.length));
  }, 60_000);

  it("packs all 27 proxies, eye colours and skins", () => {
    expect(built.proxyManifest.proxies).toHaveLength(27);
    expect(built.proxyManifest.eyeColours).toContain("brown");
    expect(built.proxyManifest.skins).toEqual(["african-female", "african-male", "asian-female", "asian-male", "caucasian-female", "caucasian-male"]);
  });

  it("fits the eyes exactly onto their authored mesh (grounded, metres)", () => {
    const eyes = find("eyes", "low-poly");
    const obj = parseObj(readFileSync(resolve(__dirname, "../../../assets/makehuman-system/eyes/low-poly/low-poly.obj"), "utf8")).positions;
    const fitted = fitOf(eyes);
    // Ground offset: compare relative to the first vertex to cancel the grounding shift.
    for (let i = 0; i < eyes.fitCount; i += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        const expected = (obj[i * 3 + axis] - obj[axis]) * 0.1;
        expect(fitted[i * 3 + axis] - fitted[axis]).toBeCloseTo(expected, 4);
      }
    }
    expect(fitted[1]).toBeGreaterThan(1.4);
  });

  it("places every hairstyle on the head", () => {
    const eyesY = fitOf(find("eyes", "low-poly"))[1];
    for (const proxy of built.proxyManifest.proxies.filter((p) => p.kind === "hair")) {
      const fitted = fitOf(proxy);
      let top = -Infinity;
      let meanX = 0;
      for (let i = 0; i < proxy.fitCount; i += 1) {
        top = Math.max(top, fitted[i * 3 + 1]);
        meanX += fitted[i * 3] / proxy.fitCount;
      }
      expect(top, proxy.name).toBeGreaterThan(eyesY + 0.08);
      expect(top, proxy.name).toBeLessThan(eyesY + 0.3);
      expect(Math.abs(meanX), proxy.name).toBeLessThan(0.03);
    }
  });

  it("skins every render vertex with normalised weights", () => {
    for (const proxy of built.proxyManifest.proxies) {
      const weights = view(Float32Array, proxy.skinWeights);
      for (let i = 0; i < proxy.vertexCount; i += 1) {
        const sum = weights[i * 4] + weights[i * 4 + 1] + weights[i * 4 + 2] + weights[i * 4 + 3];
        expect(sum, `${proxy.kind}/${proxy.name}`).toBeCloseTo(1, 4);
      }
    }
  });
});
