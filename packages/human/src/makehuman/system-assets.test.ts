/**
 * @file system-assets.test.ts
 * @description Integrity checks for the vendored MakeHuman system assets: provenance, the six
 *   young skins, eye colours, and every proxy (eyes, eyebrows, eyelashes, hair) with its
 *   .mhclo, .obj and diffuse texture, where the .mhclo has one fitting row per .obj vertex.
 * @scope cinelab-studio
 * @depends ../../assets/makehuman-system
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ASSETS = resolve(__dirname, "../../assets/makehuman-system");
const read = (rel: string) => readFileSync(join(ASSETS, rel), "utf8");
const dirs = (rel: string) => readdirSync(join(ASSETS, rel));

/** Fitting rows of an .mhclo: numeric lines after `verts`, up to an optional `delete_verts`. */
function fittingRows(text: string): number {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => /^verts\b/.test(line));
  const end = lines.findIndex((line) => /^delete_verts\b/.test(line));
  return lines.slice(start + 1, end < 0 ? undefined : end).filter((line) => /^\s*\d/.test(line)).length;
}

describe("vendored MakeHuman system assets", () => {
  it("records the asset pack checksum and CC0 license", () => {
    expect(read("SOURCE.md")).toMatch(/SHA-256 of the zip: `[0-9a-f]{64}`/);
    expect(read("LICENSE.ASSETS.md")).toContain("CC0 1.0 Universal");
  });

  it("has young skins for three ethnicities and two genders", () => {
    for (const ethnicity of ["african", "asian", "caucasian"]) {
      for (const gender of ["female", "male"]) expect(existsSync(join(ASSETS, `skins/${ethnicity}-${gender}.jpg`))).toBe(true);
    }
  });

  it("has nine eye colours", () => {
    expect(dirs("eyes/colours")).toHaveLength(9);
    expect(dirs("eyes/colours")).toContain("brown.png");
  });

  it("has complete proxies whose fitting rows match their mesh vertices", () => {
    const proxies = [["eyes", "low-poly"], ...["eyebrows", "eyelashes", "hair"].flatMap((kind) => dirs(kind).map((name) => [kind, name]))];
    expect(proxies.length).toBe(1 + 12 + 4 + 10);
    for (const [kind, name] of proxies) {
      const obj = read(`${kind}/${name}/${name}.obj`);
      const vertices = obj.match(/^v /gm)?.length ?? 0;
      expect(fittingRows(read(`${kind}/${name}/${name}.mhclo`)), `${kind}/${name}`).toBe(vertices);
      if (kind !== "eyes") expect(existsSync(join(ASSETS, `${kind}/${name}/diffuse.png`)), `${kind}/${name}`).toBe(true);
    }
  });
});
