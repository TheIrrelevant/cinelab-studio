/**
 * @file system-inputs.ts
 * @description Reads the vendored MakeHuman system assets for the converter: proxies (.mhclo +
 *   .obj + texture names), eye colours and skins, plus the list of texture files to copy next
 *   to the converter output (`proxies/<kind>/<name>/`, `eyes/`, `skins/`).
 * @scope cinelab-studio
 * @depends ../src/makehuman/convert/mhclo.ts, ../src/makehuman/convert/obj-mesh.ts,
 *   ../src/makehuman/convert/proxy-pack.ts, ../src/makehuman/proxy-manifest.ts, ../assets/makehuman-system
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseMhclo } from "../src/makehuman/convert/mhclo.ts";
import { parseObj } from "../src/makehuman/convert/obj-mesh.ts";
import type { ProxyInput } from "../src/makehuman/convert/proxy-pack.ts";
import type { ProxyKind } from "../src/makehuman/proxy-manifest.ts";

export const SYSTEM = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/makehuman-system");
const KINDS: ProxyKind[] = ["eyes", "eyebrows", "eyelashes", "hair"];

type Copy = { from: string; to: string };

export function loadSystemInputs() {
  const proxies: ProxyInput[] = [];
  const copies: Copy[] = [];
  for (const kind of KINDS) {
    for (const name of readdirSync(join(SYSTEM, kind)).sort()) {
      const dir = join(SYSTEM, kind, name);
      if (!existsSync(join(dir, `${name}.mhclo`))) continue;
      const textures: ProxyInput["textures"] = {};
      for (const [slot, file] of [["diffuse", "diffuse.png"], ["normal", "normal.png"]] as const) {
        if (!existsSync(join(dir, file))) continue;
        textures[slot] = file;
        copies.push({ from: join(dir, file), to: `proxies/${kind}/${name}/${file}` });
      }
      proxies.push({
        kind,
        name,
        mhclo: parseMhclo(readFileSync(join(dir, `${name}.mhclo`), "utf8")),
        obj: parseObj(readFileSync(join(dir, `${name}.obj`), "utf8")),
        textures,
      });
    }
  }
  const eyeColours = readdirSync(join(SYSTEM, "eyes/colours")).filter((f) => f.endsWith(".png")).sort();
  eyeColours.forEach((file) => copies.push({ from: join(SYSTEM, "eyes/colours", file), to: `eyes/${file}` }));
  const skins = readdirSync(join(SYSTEM, "skins")).filter((f) => f.endsWith(".jpg")).sort();
  skins.forEach((file) => copies.push({ from: join(SYSTEM, "skins", file), to: `skins/${file}` }));
  return {
    proxies,
    eyeColours: eyeColours.map((file) => file.replace(/\.png$/, "")),
    skins: skins.map((file) => file.replace(/\.jpg$/, "")),
    copies,
  };
}

export function copyTextures(copies: Copy[], outDir: string) {
  for (const { from, to } of copies) {
    mkdirSync(dirname(join(outDir, to)), { recursive: true });
    copyFileSync(from, join(outDir, to));
  }
}
