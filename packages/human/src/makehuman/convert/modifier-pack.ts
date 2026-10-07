/**
 * @file modifier-pack.ts
 * @description Builds the modifier pack (plan 2.1): the catalogue from target.json plus the
 *   breast cup/firmness macros and the Face Units (plan 3.1), packed with the same source vertex indexing as the morph pack so
 *   the runtime can add them to the same CPU morph. Fails if the catalogue names a missing target.
 * @scope cinelab-studio
 * @depends ./binary-builder.ts, ./morph-pack.ts, ../modifier-catalogue.ts, ../morph-manifest.ts
 */

import { BinaryBuilder } from "./binary-builder.ts";
import { packMorphs, type NamedTarget } from "./morph-pack.ts";
import { buildCatalogue, catalogueTargets, type TargetJson } from "../modifier-catalogue.ts";
import type { ModifierManifest } from "../morph-manifest.ts";

export type ModifierInput = {
  json: TargetJson;
  groups: readonly string[];
  /** Local modifier and breast macro targets, named `<group>/<file without suffix>`. */
  targets: NamedTarget[];
  breastMacros: string[];
  /** Facial action targets, named `faceunits/<ARKit name>`. */
  faceUnits: NamedTarget[];
};

export function packModifiers(input: ModifierInput, compact: Int32Array, unit: number, sourceCount: number) {
  const catalogue = buildCatalogue(input.json, input.groups);
  const byName = new Map(input.targets.map((t) => [t.name, t]));
  const names = [...catalogueTargets(catalogue), ...input.breastMacros];
  const missing = names.filter((name) => !byName.has(name));
  if (missing.length) throw new Error(`Modifier targets missing: ${missing.slice(0, 5).join(", ")}`);
  const bin = new BinaryBuilder();
  const packed = packMorphs([...names.map((name) => byName.get(name)!), ...input.faceUnits], compact, unit, bin);
  const faceUnits = input.faceUnits.map((t) => t.name);
  const manifest: ModifierManifest = { version: 1, sourceCount, scale: packed.scale, catalogue, breastMacros: input.breastMacros, faceUnits, targets: packed.targets };
  return { manifest, bin: bin.toBytes() };
}
