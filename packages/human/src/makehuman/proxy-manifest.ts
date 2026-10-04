/**
 * @file proxy-manifest.ts
 * @description JSON manifest of the MakeHuman proxy pack (hair, eyes, eyebrows, eyelashes),
 *   shared by the converter and the runtime. Offsets are byte offsets into
 *   makehuman-proxies.bin; source indices refer to the morph pack's source vertices.
 * @scope cinelab-studio
 * @depends ./morph-manifest
 */

import type { Section } from "./morph-manifest";

export const PROXY_KINDS = ["eyes", "eyebrows", "eyelashes", "hair"] as const;
export type ProxyKind = (typeof PROXY_KINDS)[number];

export type PackedProxy = {
  kind: ProxyKind;
  name: string;
  /** Fitted proxy vertices (before UV seam split). */
  fitCount: number;
  /** Render vertices (after UV seam split). */
  vertexCount: number;
  /** Uint16 x3 source indices per fitted vertex. */
  refs: Section;
  /** Float32 x3 barycentric weights per fitted vertex. */
  weights: Section;
  /** Float32 x3 offsets in metres per fitted vertex. */
  offsets: Section;
  /** [a, b, lengthMetres] for x, y, z (a, b are source indices). */
  scaleRefs: number[];
  /** Uint32 fitted vertex per render vertex. */
  renderFit: Section;
  /** Float32 x2 per render vertex (glTF orientation, V down). */
  uvs: Section;
  /** Uint32 triangle indices. */
  indices: Section;
  /** Uint16 x4 bone indices and Float32 x4 weights per render vertex. */
  joints: Section;
  skinWeights: Section;
  /** Texture file names relative to the proxy folder (`proxies/<kind>/<name>/`). */
  textures: { diffuse?: string; normal?: string };
};

export type ProxyManifest = { version: 1; proxies: PackedProxy[]; eyeColours: string[]; skins: string[] };
