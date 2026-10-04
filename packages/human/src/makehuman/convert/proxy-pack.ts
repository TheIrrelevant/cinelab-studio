/**
 * @file proxy-pack.ts
 * @description Converts parsed proxies (.mhclo + .obj) into the proxy pack: fitting data in
 *   source-vertex space (metres), a UV-split triangle mesh and skin weights blended from the
 *   three referenced base vertices.
 * @scope cinelab-studio
 * @depends ./binary-builder.ts, ./mhclo.ts, ./obj-mesh.ts, ./skin-weights.ts, ../proxy-manifest.ts
 */

import type { BinaryBuilder } from "./binary-builder.ts";
import type { Mhclo } from "./mhclo.ts";
import { buildGroupMesh, type ObjData } from "./obj-mesh.ts";
import { buildProxySkin, type WeightsJson } from "./skin-weights.ts";
import type { PackedProxy, ProxyKind } from "../proxy-manifest.ts";

export type ProxyInput = {
  kind: ProxyKind;
  name: string;
  mhclo: Mhclo;
  obj: ObjData;
  textures: PackedProxy["textures"];
};

/** OBJ vertex indices a proxy depends on (fitting triangles and scale references). */
export function proxyBaseVertices(proxy: ProxyInput): number[] {
  const { x, y, z } = proxy.mhclo.scale;
  return [...proxy.mhclo.refs.flat(), x.a, x.b, y.a, y.b, z.a, z.b];
}

/**
 * @param compact Source index per base OBJ vertex (-1 = not in the source set).
 * @param unit MakeHuman units to metres.
 */
export function packProxy(
  proxy: ProxyInput,
  compact: Int32Array,
  unit: number,
  boneNames: string[],
  weights: WeightsJson,
  out: BinaryBuilder,
): PackedProxy {
  const { mhclo } = proxy;
  const fitCount = mhclo.refs.length;
  if (proxy.obj.positions.length / 3 !== fitCount) throw new Error(`${proxy.kind}/${proxy.name}: mhclo rows do not match mesh`);
  const toSource = (v: number) => {
    const index = compact[v];
    if (index === undefined || index < 0) throw new Error(`${proxy.kind}/${proxy.name}: base vertex ${v} not in source set`);
    return index;
  };
  const mesh = buildGroupMesh(proxy.obj, "default");
  const skin = buildProxySkin(mhclo.refs, mhclo.weights, mesh.source, boneNames, weights);
  const { x, y, z } = mhclo.scale;
  return {
    kind: proxy.kind,
    name: proxy.name,
    fitCount,
    vertexCount: mesh.source.length,
    refs: out.append(Uint16Array.from(mhclo.refs.flat(), toSource)),
    weights: out.append(Float32Array.from(mhclo.weights.flat())),
    offsets: out.append(Float32Array.from(mhclo.offsets.flat(), (value) => value * unit)),
    scaleRefs: [x, y, z].flatMap((axis) => [toSource(axis.a), toSource(axis.b), axis.length * unit]),
    renderFit: out.append(mesh.source),
    uvs: out.append(mesh.uvs),
    indices: out.append(mesh.indices),
    joints: out.append(skin.joints),
    skinWeights: out.append(skin.weights),
    textures: proxy.textures,
  };
}
