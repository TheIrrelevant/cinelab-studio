/**
 * @file mesh-slice.ts
 * @description Horizontal cross-sections of a closed triangle mesh (plan 2.3). A plane y = h cuts
 *   every triangle with vertices on both sides into one segment; segments meet on shared edges, so
 *   they chain into closed loops in the XZ plane. A tape measure spans concave dips, so a loop's
 *   girth is the perimeter of its convex hull.
 * @scope cinelab-studio
 * @depends none
 */

/** Closed polygon in the horizontal plane: x, z pairs. */
export type Loop = Float64Array;

const edgeKey = (a: number, b: number) => (a < b ? a * 65536 + b : b * 65536 + a);

/** Loops where the plane y = `height` cuts the mesh (`triangles` index `positions`). */
export function sliceLoops(positions: Float32Array, triangles: Uint32Array, height: number): Loop[] {
  const above = (v: number) => positions[v * 3 + 1] >= height;
  const point = new Map<number, [number, number]>();
  const links = new Map<number, number[]>();
  const cut = (a: number, b: number) => {
    const key = edgeKey(a, b);
    if (!point.has(key)) {
      const ya = positions[a * 3 + 1];
      const t = (height - ya) / (positions[b * 3 + 1] - ya);
      point.set(key, [positions[a * 3] + t * (positions[b * 3] - positions[a * 3]), positions[a * 3 + 2] + t * (positions[b * 3 + 2] - positions[a * 3 + 2])]);
    }
    return key;
  };
  const link = (from: number, to: number) => {
    const list = links.get(from);
    if (list) list.push(to);
    else links.set(from, [to]);
  };
  for (let i = 0; i < triangles.length; i += 3) {
    const keys: number[] = [];
    for (let k = 0; k < 3; k += 1) {
      const a = triangles[i + k];
      const b = triangles[i + ((k + 1) % 3)];
      if (above(a) !== above(b)) keys.push(cut(a, b));
    }
    if (keys.length !== 2) continue;
    link(keys[0], keys[1]);
    link(keys[1], keys[0]);
  }
  const loops: Loop[] = [];
  const seen = new Set<number>();
  for (const start of links.keys()) {
    if (seen.has(start)) continue;
    const coords: number[] = [];
    let previous = -1;
    let current = start;
    while (!seen.has(current)) {
      seen.add(current);
      coords.push(...point.get(current)!);
      const next = links.get(current)!.find((key) => key !== previous && !seen.has(key));
      if (next === undefined) break;
      previous = current;
      current = next;
    }
    if (coords.length >= 6) loops.push(Float64Array.from(coords));
  }
  return loops;
}

/** Absolute enclosed area (shoelace). */
export function loopArea(loop: Loop): number {
  let sum = 0;
  for (let i = 0; i < loop.length; i += 2) {
    const j = (i + 2) % loop.length;
    sum += loop[i] * loop[j + 1] - loop[j] * loop[i + 1];
  }
  return Math.abs(sum) / 2;
}

/** Perimeter of the convex hull (monotone chain), i.e. a tape measure around the loop. */
export function hullPerimeter(loop: Loop): number {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < loop.length; i += 2) points.push([loop[i], loop[i + 1]]);
  points.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Array<[number, number]>) => {
    const out: Array<[number, number]> = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  const hull = [...half(points), ...half([...points].reverse())];
  let perimeter = 0;
  for (let i = 0; i < hull.length; i += 1) {
    const [x1, z1] = hull[i];
    const [x2, z2] = hull[(i + 1) % hull.length];
    perimeter += Math.hypot(x2 - x1, z2 - z1);
  }
  return perimeter;
}
