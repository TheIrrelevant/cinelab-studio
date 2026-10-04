/**
 * @file mhclo.ts
 * @description Parses MakeHuman proxy fitting files (.mhclo). Each proxy vertex is either a
 *   copy of one base vertex (`v`) or a weighted triangle of base vertices plus an offset
 *   (`v1 v2 v3 w1 w2 w3 dx dy dz`). Offsets are scaled per axis by the ratio between the
 *   current and the reference distance of two base vertices (`x_scale v1 v2 length`).
 * @scope cinelab-studio
 * @depends none
 */

export type AxisScale = { a: number; b: number; length: number };

export type Mhclo = {
  name: string;
  objFile: string;
  scale: { x: AxisScale; y: AxisScale; z: AxisScale };
  /** Per proxy vertex: three base vertex indices. */
  refs: number[][];
  /** Per proxy vertex: three barycentric weights. */
  weights: number[][];
  /** Per proxy vertex: offset in MakeHuman units before axis scaling. */
  offsets: number[][];
};

export function parseMhclo(text: string): Mhclo {
  const result: Partial<Omit<Mhclo, "scale">> & { scale: Partial<Mhclo["scale"]> } = { scale: {}, refs: [], weights: [], offsets: [] };
  let inVerts = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (/^\d/.test(line) && inVerts) {
      const values = parts.map(Number);
      if (values.length === 1) {
        result.refs!.push([values[0], values[0], values[0]]);
        result.weights!.push([1, 0, 0]);
        result.offsets!.push([0, 0, 0]);
      } else if (values.length === 9 && values.every(Number.isFinite)) {
        result.refs!.push(values.slice(0, 3));
        result.weights!.push(values.slice(3, 6));
        result.offsets!.push(values.slice(6, 9));
      } else {
        throw new Error(`Invalid mhclo vertex row: "${line}"`);
      }
      continue;
    }
    const [key, ...args] = parts;
    if (key === "delete_verts") break;
    if (key === "name") result.name = args.join(" ");
    else if (key === "obj_file") result.objFile = args[0];
    else if (key === "verts") {
      if (Number(args[0]) !== 0) throw new Error(`Unsupported mhclo vertex offset ${args[0]}`);
      inVerts = true;
    } else if (key === "x_scale" || key === "y_scale" || key === "z_scale") {
      result.scale[key[0] as "x" | "y" | "z"] = { a: Number(args[0]), b: Number(args[1]), length: Number(args[2]) };
    }
  }
  const { x, y, z } = result.scale;
  if (!result.objFile || !x || !y || !z) throw new Error(`Incomplete mhclo ${result.name ?? ""}`);
  return { name: result.name ?? result.objFile, objFile: result.objFile, scale: { x, y, z }, refs: result.refs!, weights: result.weights!, offsets: result.offsets! };
}
