/**
 * @file vendor-faceunits.mjs
 * @description One-time copy of the MakeHuman "Face Units 01" asset pack (52 ARKit-style facial
 *   action targets by Mika Suominen, CC0) into packages/human/assets/makehuman/targets/faceunits as
 *   gzipped targets, with a checksum-pinned source note (plan 3.1). Every target must be listed as
 *   CC0 in the pack JSON and carry no other license header.
 *   Usage: node tools/vendor-faceunits.mjs [path-to-downloaded-zip]
 * @scope cinelab-studio
 * @depends node:child_process, node:crypto, node:fs, node:os, node:path, node:url, node:zlib, unzip
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = join(ROOT, "packages/human/assets/makehuman/targets/faceunits");
const URL = "https://files2.makehumancommunity.org/functional/faceunits01.zip";
const SHA256 = "d113107bd7eb59f3af4df6fc0ec29bfcc593f496d0b336aec14f086a80ce7146";
const COUNT = 52;

const given = process.argv[2];
const work = mkdtempSync(join(tmpdir(), "faceunits-"));
const zip = given ? resolve(given) : join(work, "faceunits01.zip");
if (!given) {
  const response = await fetch(URL);
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  writeFileSync(zip, Buffer.from(await response.arrayBuffer()));
}
const hash = createHash("sha256").update(readFileSync(zip)).digest("hex");
if (hash !== SHA256) throw new Error(`Unexpected face units checksum ${hash}`);
execFileSync("unzip", ["-q", zip, "-d", work]);

const pack = JSON.parse(readFileSync(join(work, "packs/faceunits01.json"), "utf8"));
const src = join(work, "targets/faceunits");
const files = readdirSync(src).filter((file) => file.endsWith(".target")).sort();
if (files.length !== COUNT) throw new Error(`Expected ${COUNT} targets, found ${files.length}`);
rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });
for (const file of files) {
  const name = file.slice(0, -".target".length);
  if (pack[name]?.license !== "CC0") throw new Error(`${name} is not listed as CC0`);
  const text = readFileSync(join(src, file), "utf8");
  if (/licen[cs]e/i.test(text)) throw new Error(`${name} carries its own license header`);
  writeFileSync(join(DEST, `${name}.target.gz`), gzipSync(text, { level: 9 }));
}
writeFileSync(
  join(DEST, "SOURCE.md"),
  [
    "---",
    "type: asset-source",
    "description: Provenance of the vendored MakeHuman Face Units 01 targets (CC0, plan 3.1).",
    "---",
    "",
    "# Face Units 01 (CC0)",
    "",
    `- Source: ${URL}`,
    `- SHA-256 of the zip: \`${SHA256}\``,
    `- ${COUNT} ARKit-style facial action targets by Mika Suominen, each listed as CC0 in`,
    "  `packs/faceunits01.json`; the target files carry no other license header.",
    "- Stored gzipped, otherwise unchanged. Regenerate with `node tools/vendor-faceunits.mjs`.",
    "",
  ].join("\n"),
);
rmSync(work, { recursive: true, force: true });
console.log(`Vendored ${files.length} face units into ${DEST}`);
