/**
 * @file vendor-makehuman-system.mjs
 * @description One-time copy of selected MakeHuman system assets (CC0 asset pack) into
 *   packages/human/assets/makehuman-system: young skins (3 ethnicities x 2 genders, 1024 JPEG),
 *   low-poly eyes and eye colours, eyebrows, eyelashes and hair (meshes, .mhclo fitting files,
 *   textures resized to 1024; hair/eyebrow colour normalised so it can be tinted at runtime).
 *   Usage: node tools/vendor-makehuman-system.mjs [path-to-downloaded-zip]
 * @scope cinelab-studio
 * @depends node:child_process, node:crypto, node:fs, node:os, node:path, node:url, sharp, unzip
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = join(ROOT, "packages/human/assets/makehuman-system");
const LICENSE = join(ROOT, "packages/human/assets/makehuman/LICENSE.ASSETS.md");
const URL = "https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip";
const SHA256 = "b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107";
const ETHNICITIES = ["african", "asian", "caucasian"];
const GENDERS = ["female", "male"];

async function download(file) {
  const response = await fetch(URL);
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
}

function unpack(zip) {
  const hash = createHash("sha256").update(readFileSync(zip)).digest("hex");
  if (hash !== SHA256) throw new Error(`Unexpected asset pack checksum ${hash}`);
  const dir = mkdtempSync(join(tmpdir(), "mhsys-"));
  execFileSync("unzip", ["-q", zip, "skins/young_*", "eyes/*", "eyebrows/*", "eyelashes/*", "hair/*", "-d", dir]);
  return dir;
}

const out = (rel) => {
  const file = join(DEST, rel);
  mkdirSync(dirname(file), { recursive: true });
  return file;
};
const pngs = (dir) => readdirSync(dir).filter((name) => name.endsWith(".png"));

/**
 * Colour removed so the runtime can tint: luminance is re-normalised to an alpha-weighted mean
 * of 0.75 and standard deviation of 0.18 (hair), or set to white (eyebrows: shape is in alpha).
 */
async function toTintable(src, size, rel, mode) {
  const { data, info } = await sharp(src)
    .resize(size, size, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const lum = (i) => (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  let sum = 0;
  let sumSq = 0;
  let weight = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    sum += alpha * lum(i);
    sumSq += alpha * lum(i) ** 2;
    weight += alpha;
  }
  const mean = sum / weight;
  const std = Math.sqrt(Math.max(sumSq / weight - mean ** 2, 1e-6));
  const pixels = Buffer.alloc((data.length / 4) * 2);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 2) {
    const value = mode === "white" ? 1 : 0.75 + ((lum(i) - mean) / std) * 0.18;
    pixels[j] = Math.round(Math.min(1, Math.max(0, value)) * 255);
    pixels[j + 1] = data[i + 3];
  }
  await sharp(pixels, { raw: { width: info.width, height: info.height, channels: 2 } }).png({ compressionLevel: 9 }).toFile(out(rel));
}
const toPng = (src, size, rel) =>
  sharp(src).resize(size, size, { fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(out(rel));

/** Copies a proxy's .mhclo and .obj under `kind/name/`. */
function copyProxy(srcDir, kind, name) {
  const mhclo = readdirSync(srcDir).find((file) => file.endsWith(".mhclo"));
  const obj = readFileSync(join(srcDir, mhclo), "utf8").match(/^obj_file\s+(\S+)/m)?.[1];
  if (!mhclo || !obj) throw new Error(`Incomplete proxy in ${srcDir}`);
  copyFileSync(join(srcDir, mhclo), out(`${kind}/${name}/${name}.mhclo`));
  copyFileSync(join(srcDir, obj), out(`${kind}/${name}/${name}.obj`));
}

async function vendor(src) {
  rmSync(DEST, { recursive: true, force: true });
  const counts = { skins: 0, eyeColours: 0, eyebrows: 0, eyelashes: 0, hair: 0 };
  for (const ethnicity of ETHNICITIES) {
    for (const gender of GENDERS) {
      const dir = join(src, "skins", `young_${ethnicity}_${gender}`);
      const diffuse = pngs(dir).find((name) => name.includes("diffuse"));
      await sharp(join(dir, diffuse)).resize(1024, 1024).jpeg({ quality: 88 }).toFile(out(`skins/${ethnicity}-${gender}.jpg`));
      counts.skins += 1;
    }
  }
  copyProxy(join(src, "eyes/low-poly"), "eyes", "low-poly");
  for (const file of pngs(join(src, "eyes/materials"))) {
    await toPng(join(src, "eyes/materials", file), 512, `eyes/colours/${basename(file, "_eye.png")}.png`);
    counts.eyeColours += 1;
  }
  // The stock brown iris reads maroon; a hue-shifted copy gives a natural dark brown (plan 2.7).
  await sharp(out("eyes/colours/brown.png")).modulate({ hue: 18, saturation: 0.7, brightness: 1.05 }).png({ compressionLevel: 9 }).toFile(out("eyes/colours/darkbrown.png"));
  counts.eyeColours += 1;
  for (const kind of ["eyebrows", "eyelashes", "hair"]) {
    for (const name of readdirSync(join(src, kind)).filter((entry) => existsSync(join(src, kind, entry, `${entry}.mhclo`)))) {
      const dir = join(src, kind, name);
      copyProxy(dir, kind, name);
      const diffuse = pngs(dir).find((file) => !file.includes("normal"));
      const normal = pngs(dir).find((file) => file.includes("normal"));
      if (kind === "eyelashes") await toPng(join(dir, diffuse), 512, `${kind}/${name}/diffuse.png`);
      else if (kind === "hair") await toTintable(join(dir, diffuse), 1024, `${kind}/${name}/diffuse.png`, "normalise");
      else await toTintable(join(dir, diffuse), 512, `${kind}/${name}/diffuse.png`, "white");
      if (normal) await toPng(join(dir, normal), 1024, `${kind}/${name}/normal.png`);
      counts[kind] += 1;
    }
  }
  copyFileSync(LICENSE, out("LICENSE.ASSETS.md"));
  writeFileSync(out("SOURCE.md"), sourceNote(counts));
  return counts;
}

function sourceNote(counts) {
  return [
    "---",
    "type: asset-source",
    "description: Provenance of the vendored MakeHuman system assets (CC0).",
    "---",
    "",
    "# MakeHuman system assets (CC0)",
    "",
    `- Source: ${URL}`,
    `- SHA-256 of the zip: \`${SHA256}\``,
    "- License: CC0 1.0 (asset pack page and file headers; see `LICENSE.ASSETS.md`).",
    `- Copied: ${JSON.stringify(counts)}.`,
    "- Skins resized to 1024 JPEG; hair, eyebrow and eye textures resized. For runtime tinting hair",
    "  is greyscale normalised to mean 0.75 / std 0.18 and eyebrows are white; alpha is kept.",
    "  `eyes/colours/darkbrown.png` is derived from `brown.png` (hue +18, saturation 0.7) because the",
    "  stock brown iris reads maroon.",
    "  Meshes and .mhclo files are unchanged.",
    "- One-time snapshot. Regenerate with `node tools/vendor-makehuman-system.mjs`.",
    "",
  ].join("\n");
}

const given = process.argv[2];
const work = mkdtempSync(join(tmpdir(), "mhsys-zip-"));
const zip = given ? resolve(given) : join(work, "assets.zip");
if (!given) await download(zip);
const src = unpack(zip);
const counts = await vendor(src);
rmSync(src, { recursive: true, force: true });
rmSync(work, { recursive: true, force: true });
console.log(`Vendored MakeHuman system assets into ${DEST}:`, counts);
