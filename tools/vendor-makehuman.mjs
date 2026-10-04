/**
 * @file vendor-makehuman.mjs
 * @description One-time copy of MakeHuman CC0 assets (base mesh, adult young/old macro targets, default rig
 *   and weights) from the mpfb2 repository into packages/human/assets/makehuman. Only data is
 *   copied; mpfb2 code is GPL and must never be vendored. Updates are intentionally not tracked.
 *   Usage: node tools/vendor-makehuman.mjs [path-to-existing-mpfb2-checkout]
 * @scope cinelab-studio
 * @depends node:child_process, node:fs, node:os, node:path, node:url, git
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = join(ROOT, "packages/human/assets/makehuman");
const REPO = "https://github.com/makehumancommunity/mpfb2.git";
const COMMIT = "d0a32e57a7f915cb2f2b95410e2117648c7bbb7e";
const DATA = "src/mpfb/data";

/** Fixed files copied as-is, relative to the mpfb2 data folder. */
const FILES = [
  "3dobjs/base.obj",
  "targets/macrodetails/macro.json",
  "rigs/standard/rig.default.json",
  "rigs/standard/weights.default.json",
];
/** Macro target folders; only young (25 y) and old (90 y) targets: the body covers ages 18-35. */
const TARGET_DIRS = ["targets/macrodetails", "targets/macrodetails/height", "targets/macrodetails/proportions"];
const isAdultTarget = (name) => name.endsWith(".target.gz") && !/-(baby|child)[-.]/.test(name);

function checkout() {
  const dir = mkdtempSync(join(tmpdir(), "mpfb2-"));
  const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: "inherit" });
  git("init", "-q");
  git("remote", "add", "origin", REPO);
  git("sparse-checkout", "set", DATA);
  git("fetch", "-q", "--depth", "1", "--filter=blob:none", "origin", COMMIT);
  git("checkout", "-q", "FETCH_HEAD");
  return { dir, temporary: true };
}

function copy(src, rel) {
  const target = join(DEST, rel);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(src, rel), target);
}

function sourceNote(count) {
  return [
    "---",
    "type: asset-source",
    "description: Provenance of the vendored MakeHuman CC0 assets.",
    "---",
    "",
    "# MakeHuman assets (CC0)",
    "",
    `- Source: ${REPO} (\`${DATA}\`), commit \`${COMMIT}\`.`,
    "- License: CC0 1.0 (see `LICENSE.ASSETS.md`). Copyright holders at release: Data Collection AB,",
    "  Joel Palmius, Jonas Hauquier.",
    "- Copied: base mesh hm08, adult macro targets (young/old; no baby or child), default rig and weights.",
    `- Target files: ${count}. Regenerate with \`node tools/vendor-makehuman.mjs\`.`,
    "- Only data is copied. mpfb2 code is GPL/AGPL and must not be copied into this repository.",
    "- Updates are not tracked on purpose; this is a one-time snapshot.",
    "",
  ].join("\n");
}

function main() {
  const given = process.argv[2];
  const source = given ? { dir: resolve(given), temporary: false } : checkout();
  const data = join(source.dir, DATA);
  if (!existsSync(data)) throw new Error(`mpfb2 data folder not found: ${data}`);
  rmSync(DEST, { recursive: true, force: true });
  for (const rel of FILES) copy(data, rel);
  let count = 0;
  for (const folder of TARGET_DIRS) {
    for (const name of readdirSync(join(data, folder)).filter(isAdultTarget)) {
      copy(data, `${folder}/${name}`);
      count += 1;
    }
  }
  copyFileSync(join(source.dir, "LICENSE.ASSETS.md"), join(DEST, "LICENSE.ASSETS.md"));
  writeFileSync(join(DEST, "SOURCE.md"), sourceNote(count));
  if (source.temporary) rmSync(source.dir, { recursive: true, force: true });
  console.log(`Vendored ${FILES.length} files and ${count} targets into ${DEST}`);
}

main();
