/**
 * @file modifier-inputs.ts
 * @description Loads the vendored modifier data for the converter: target.json, every target of
 *   the vendored modifier groups (named `<group>/<file>`), the breast cup/firmness macro names and
 *   the 52 Face Units (`faceunits/<name>`, plan 3.1, vendored by tools/vendor-faceunits.mjs).
 *   The groups are the target.json groups that were vendored (see tools/vendor-makehuman.mjs).
 * @scope cinelab-studio
 * @depends ../src/makehuman/target-file.ts, ../src/makehuman/modifier-catalogue.ts, ../assets/makehuman
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import type { ModifierInput } from "../src/makehuman/convert/modifier-pack.ts";
import { isBreastMacro, type TargetJson } from "../src/makehuman/modifier-catalogue.ts";
import { parseTarget } from "../src/makehuman/target-file.ts";

const SUFFIX = ".target.gz";

export function loadModifierInput(assets: string): ModifierInput {
  const root = join(assets, "targets");
  const json = JSON.parse(readFileSync(join(root, "target.json"), "utf8")) as TargetJson;
  const groups = Object.keys(json).filter((group) => existsSync(join(root, group)));
  const targets = groups.flatMap((group) =>
    readdirSync(join(root, group))
      .filter((file) => file.endsWith(SUFFIX))
      .sort()
      .map((file) => ({
        name: `${group}/${file.slice(0, -SUFFIX.length)}`,
        target: parseTarget(gunzipSync(readFileSync(join(root, group, file))).toString("utf8")),
      })),
  );
  const breastMacros = targets.map((t) => t.name).filter((name) => name.startsWith("breast/") && isBreastMacro(name.slice(7)));
  const faceDir = join(root, "faceunits");
  const faceUnits = readdirSync(faceDir)
    .filter((file) => file.endsWith(SUFFIX))
    .sort()
    .map((file) => ({ name: `faceunits/${file.slice(0, -SUFFIX.length)}`, target: parseTarget(gunzipSync(readFileSync(join(faceDir, file))).toString("utf8")) }));
  return { json, groups, targets, breastMacros, faceUnits };
}
