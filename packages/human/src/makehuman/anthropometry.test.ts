/**
 * @file anthropometry.test.ts
 * @description Plan 2.3 measurements on the real body: closed mesh, plausible height, mass, waist
 *   and BMI for the default body, and measurements that follow the height and weight parameters.
 * @scope cinelab-studio
 * @depends ./anthropometry, ./load-body, ./morph-data, ./shape-model
 */

import { beforeAll, describe, expect, it } from "vitest";
import { buildAssets } from "../../scripts/build-assets.ts";
import { measureBody, measureTopology, meshVolume, type MeasureTopology } from "./anthropometry";
import { parseBody, type LoadedBody } from "./load-body";
import { morphSourcePositions } from "./morph-data";
import { DEFAULT_SHAPE, shapeTargetWeights, type ShapeParams } from "./shape-model";

let body: LoadedBody;
let topology: MeasureTopology;
const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

beforeAll(async () => {
  const built = buildAssets();
  body = await parseBody({
    glb: buffer(built.glb), manifest: built.manifest, morphs: buffer(built.morphBin), proxyManifest: built.proxyManifest, proxies: buffer(built.proxyBin),
    modifierManifest: built.modifiers!.manifest, modifiers: buffer(built.modifiers!.bin),
  });
  topology = measureTopology(body.data, body.mesh.geometry.getIndex()!.array);
}, 60_000);

const positions = (params: Partial<ShapeParams>) =>
  morphSourcePositions(body.data, shapeTargetWeights({ ...DEFAULT_SHAPE, ...params }, body.data.modifiers!.catalogue));
const measure = (params: Partial<ShapeParams>) => measureBody(positions(params), topology);

describe("anthropometry (plan 2.3)", () => {
  it("measures a closed body mesh (every edge shared by two triangles)", () => {
    const edges = new Map<string, number>();
    const { triangles } = topology;
    for (let i = 0; i < triangles.length; i += 3) {
      for (let k = 0; k < 3; k += 1) {
        const [a, b] = [triangles[i + k], triangles[i + ((k + 1) % 3)]];
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    expect([...edges.values()].every((count) => count === 2)).toBe(true);
    expect(topology.vertices.length).toBe(13_380);
  });

  it("gives plausible adult measurements for the default body", () => {
    const m = measure({});
    expect(m.heightCm).toBeGreaterThan(155);
    expect(m.heightCm).toBeLessThan(180);
    expect(m.massKg).toBeGreaterThan(45);
    expect(m.massKg).toBeLessThan(80);
    expect(m.waistCm).toBeGreaterThan(60);
    expect(m.waistCm).toBeLessThan(95);
    expect(m.bmi).toBeCloseTo(m.massKg / (m.heightCm / 100) ** 2, 6);
    expect(m.volumeM3 * 980).toBeCloseTo(m.massKg, 6);
  });

  it("does not depend on where the body stands (volume is translation invariant)", () => {
    const p = positions({});
    const moved = p.map((v, i) => v + [0.4, -0.2, 1.1][i % 3]);
    expect(meshVolume(moved, topology.triangles)).toBeCloseTo(meshVolume(p, topology.triangles), 6);
  });

  it("follows the height and weight parameters", () => {
    const short = measure({ height: 0 });
    const tall = measure({ height: 1 });
    const thin = measure({ weight: 0 });
    const heavy = measure({ weight: 1 });
    expect(tall.heightCm - short.heightCm).toBeGreaterThan(20);
    expect(heavy.massKg - thin.massKg).toBeGreaterThan(8);
    expect(heavy.waistCm).toBeGreaterThan(thin.waistCm + 4);
    expect(tall.massKg).toBeGreaterThan(short.massKg);
  });

});
