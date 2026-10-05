/**
 * @file build-assets.ts
 * @description CLI: converts the vendored MakeHuman assets into makehuman-base.glb,
 *   makehuman-morphs.bin/.json and makehuman-proxies.bin/.json, and copies skin, eye and proxy
 *   textures into the given output folder.
 *   Run with Node's built-in type stripping: node packages/human/scripts/build-assets.ts <outDir>
 * @scope cinelab-studio
 * @depends ../src/makehuman/convert/build.ts, ../src/makehuman/target-file.ts, ./system-inputs.ts,
 *   ../assets/makehuman
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { convertMakeHuman } from "../src/makehuman/convert/build.ts";
import type { NamedTarget } from "../src/makehuman/convert/morph-pack.ts";
import { parseTarget } from "../src/makehuman/target-file.ts";
import { copyTextures, loadSystemInputs } from "./system-inputs.ts";

export const ASSETS = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/makehuman");
const MACRO = join(ASSETS, "targets/macrodetails");
const TARGET_DIRS = ["", "height", "proportions"];
const SUFFIX = ".target.gz";

/** Targets named relative to macrodetails without suffix, e.g. `height/male-young-...-maxheight`. */
export function loadTargets(): NamedTarget[] {
  return TARGET_DIRS.flatMap((dir) =>
    readdirSync(join(MACRO, dir))
      .filter((file) => file.endsWith(SUFFIX))
      .sort()
      .map((file) => ({
        name: (dir ? `${dir}/` : "") + file.slice(0, -SUFFIX.length),
        target: parseTarget(gunzipSync(readFileSync(join(MACRO, dir, file))).toString("utf8")),
      })),
  );
}

export function buildAssets() {
  const json = (rel: string) => JSON.parse(readFileSync(join(ASSETS, rel), "utf8"));
  const system = loadSystemInputs();
  const result = convertMakeHuman({
    obj: readFileSync(join(ASSETS, "3dobjs/base.obj"), "utf8"),
    rig: json("rigs/standard/rig.default.json"),
    weights: json("rigs/standard/weights.default.json"),
    targets: loadTargets(),
    proxies: system.proxies,
    eyeColours: system.eyeColours,
    skins: system.skins,
  });
  return { ...result, textureCopies: system.copies };
}

function main(outDir: string) {
  const started = Date.now();
  const result = buildAssets();
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "makehuman-base.glb"), result.glb);
  writeFileSync(join(outDir, "makehuman-morphs.bin"), result.morphBin);
  writeFileSync(join(outDir, "makehuman-morphs.json"), JSON.stringify(result.manifest));
  writeFileSync(join(outDir, "makehuman-proxies.bin"), result.proxyBin);
  writeFileSync(join(outDir, "makehuman-proxies.json"), JSON.stringify(result.proxyManifest));
  copyTextures(result.textureCopies, outDir);
  const mb = (bytes: number) => (bytes / 1e6).toFixed(1);
  console.log(
    `MakeHuman assets -> ${outDir}: glb ${mb(result.glb.byteLength)} MB, morphs ${mb(result.morphBin.byteLength)} MB, ` +
      `proxies ${result.proxyManifest.proxies.length} (${mb(result.proxyBin.byteLength)} MB), ` +
      `${result.manifest.targets.length} targets, ${result.manifest.vertexCount} vertices, ` +
      `${result.manifest.bones.length} bones, ${result.unweighted} unweighted, ${Date.now() - started} ms`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outDir = process.argv[2];
  if (!outDir) throw new Error("Usage: node packages/human/scripts/build-assets.ts <outDir>");
  main(resolve(outDir));
}
