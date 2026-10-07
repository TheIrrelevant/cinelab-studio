/**
 * @file subdivision.ts
 * @description Denser topology (plan 2.8, D5): one Catmull-Clark level on a closed quad cage plus a
 *   projection of every level-1 vertex onto the limit surface. Both steps are linear, so they are
 *   stored as sparse stencils (CSR) and applied to any per-vertex attribute: positions at runtime,
 *   bone weights in the converter. Dense vertex order: vertex points, edge points, face points.
 * @scope cinelab-studio
 * @depends none
 */

/** Sparse rows: row r reads `cols[offsets[r]..offsets[r+1]]` with matching `weights`. */
export type Stencils = { offsets: Uint32Array; cols: Uint32Array; weights: Float32Array };

export type Subdivision = {
  /** Size of the coarse index space the cage quads index into. */
  coarseCount: number;
  /** Coarse index of each cage vertex; dense index of vertex point i is i. */
  cageVertices: Uint32Array;
  /** Coarse index -> dense vertex point, -1 when the vertex is not on the cage. */
  vertexDense: Int32Array;
  /** Edge key (see `edgeKey`) -> dense edge point index. */
  edgeDense: Map<number, number>;
  /** Dense index of the first face point; face f is `faceBase + f`. */
  faceBase: number;
  denseCount: number;
  /** Level-1 quads in dense indexing, same winding as the cage. */
  quads: Uint32Array;
  /** Rows: dense vertices, columns: coarse indices. */
  level1: Stencils;
  /** Rows and columns: dense vertices (level-1 -> limit surface). */
  limit: Stencils;
};

export const edgeKey = (a: number, b: number, coarseCount: number) => (a < b ? a * coarseCount + b : b * coarseCount + a);

class StencilBuilder {
  offsets: number[] = [0];
  cols: number[] = [];
  weights: number[] = [];
  private row = new Map<number, number>();
  add(col: number, weight: number) {
    this.row.set(col, (this.row.get(col) ?? 0) + weight);
  }
  end() {
    for (const [col, weight] of this.row) {
      this.cols.push(col);
      this.weights.push(weight);
    }
    this.offsets.push(this.cols.length);
    this.row.clear();
  }
  build(): Stencils {
    return { offsets: Uint32Array.from(this.offsets), cols: Uint32Array.from(this.cols), weights: Float32Array.from(this.weights) };
  }
}

/** Incident quads per vertex as CSR (vertex -> quad indices). */
function incidentQuads(quads: ArrayLike<number>, count: number) {
  const offsets = new Uint32Array(count + 1);
  for (let i = 0; i < quads.length; i += 1) offsets[quads[i] + 1] += 1;
  for (let v = 0; v < count; v += 1) offsets[v + 1] += offsets[v];
  const fill = offsets.slice(0, count);
  const faces = new Uint32Array(quads.length);
  for (let i = 0; i < quads.length; i += 1) faces[fill[quads[i]]++] = i >> 2;
  return { offsets, faces };
}

/**
 * Ring stencil of vertex `v`: centre weight for v, `edge` per incident-quad occurrence of each edge
 * neighbour (every neighbour occurs in two quads), `diagonal` for each opposite corner.
 */
function addRing(out: StencilBuilder, quads: ArrayLike<number>, ring: ReturnType<typeof incidentQuads>, v: number, weights: (n: number) => [number, number, number]) {
  const start = ring.offsets[v];
  const n = ring.offsets[v + 1] - start;
  const [centre, edge, diagonal] = weights(n);
  out.add(v, centre);
  for (let k = start; k < start + n; k += 1) {
    const q = ring.faces[k] * 4;
    let at = 0;
    while (quads[q + at] !== v) at += 1;
    out.add(quads[q + ((at + 1) & 3)], edge);
    out.add(quads[q + ((at + 2) & 3)], diagonal);
    out.add(quads[q + ((at + 3) & 3)], edge);
  }
}

/** Catmull-Clark vertex point: (4n - 7) / 4n, 3 / 2n^2 per neighbour, 1 / 4n^2 per diagonal. */
const vertexPointWeights = (n: number): [number, number, number] => [(4 * n - 7) / (4 * n), 3 / (4 * n * n), 1 / (4 * n * n)];
/** Limit position on a quad mesh: (n^2 v + 4 sum(edge) + sum(diagonal)) / n(n + 5). */
const limitWeights = (n: number): [number, number, number] => [n / (n + 5), 2 / (n * (n + 5)), 1 / (n * (n + 5))];

/** @param quads Closed, manifold quad cage (4 coarse indices per quad, consistent winding). */
export function buildSubdivision(quads: ArrayLike<number>, coarseCount: number): Subdivision {
  if (quads.length % 4 !== 0) throw new Error("Cage must be quads");
  const vertexDense = new Int32Array(coarseCount).fill(-1);
  const cage: number[] = [];
  for (let i = 0; i < quads.length; i += 1) {
    if (vertexDense[quads[i]] < 0) vertexDense[quads[i]] = cage.push(quads[i]) - 1;
  }
  const edgeDense = new Map<number, number>();
  const edges: number[] = [];
  const edgeFaces: number[][] = [];
  for (let i = 0; i < quads.length; i += 1) {
    const a = quads[i];
    const b = quads[(i & ~3) + ((i + 1) & 3)];
    const key = edgeKey(a, b, coarseCount);
    let e = edgeDense.get(key);
    if (e === undefined) {
      e = cage.length + edges.length / 2;
      edgeDense.set(key, e);
      edges.push(a, b);
      edgeFaces.push([]);
    }
    edgeFaces[e - cage.length].push(i >> 2);
  }
  const faceBase = cage.length + edges.length / 2;
  const faceCount = quads.length / 4;
  const level1 = new StencilBuilder();
  const coarseRing = incidentQuads(quads, coarseCount);
  for (const v of cage) {
    addRing(level1, quads, coarseRing, v, vertexPointWeights);
    level1.end();
  }
  for (let e = 0; e < edgeFaces.length; e += 1) {
    if (edgeFaces[e].length !== 2) throw new Error("Cage must be closed and manifold");
    level1.add(edges[e * 2], 0.25);
    level1.add(edges[e * 2 + 1], 0.25);
    for (const f of edgeFaces[e]) for (let k = 0; k < 4; k += 1) level1.add(quads[f * 4 + k], 1 / 16);
    level1.end();
  }
  for (let f = 0; f < faceCount; f += 1) {
    for (let k = 0; k < 4; k += 1) level1.add(quads[f * 4 + k], 0.25);
    level1.end();
  }

  const fine = new Uint32Array(quads.length * 4);
  for (let f = 0; f < faceCount; f += 1) {
    const corner = (k: number) => quads[f * 4 + (k & 3)];
    const edge = (k: number) => edgeDense.get(edgeKey(corner(k), corner(k + 1), coarseCount))!;
    for (let k = 0; k < 4; k += 1) fine.set([vertexDense[corner(k)], edge(k), faceBase + f, edge(k + 3)], (f * 4 + k) * 4);
  }
  const denseCount = faceBase + faceCount;
  const limit = new StencilBuilder();
  const fineRing = incidentQuads(fine, denseCount);
  for (let v = 0; v < denseCount; v += 1) {
    addRing(limit, fine, fineRing, v, limitWeights);
    limit.end();
  }
  return {
    coarseCount,
    cageVertices: Uint32Array.from(cage),
    vertexDense,
    edgeDense,
    faceBase,
    denseCount,
    quads: fine,
    level1: level1.build(),
    limit: limit.build(),
  };
}

/** out[row] = sum(weight * input[col]) for `stride` channels per vertex. */
export function applyStencils(s: Stencils, input: ArrayLike<number>, stride: number, out: Float32Array = new Float32Array((s.offsets.length - 1) * stride)): Float32Array {
  const { offsets, cols, weights } = s;
  for (let r = 0; r + 1 < offsets.length; r += 1) {
    const o = r * stride;
    for (let c = 0; c < stride; c += 1) out[o + c] = 0;
    for (let k = offsets[r]; k < offsets[r + 1]; k += 1) {
      const w = weights[k];
      const i = cols[k] * stride;
      for (let c = 0; c < stride; c += 1) out[o + c] += w * input[i + c];
    }
  }
  return out;
}

/** Coarse attribute -> dense attribute on the limit surface. */
export function subdivide(sub: Subdivision, coarse: ArrayLike<number>, stride: number, out?: Float32Array): Float32Array {
  return applyStencils(sub.limit, applyStencils(sub.level1, coarse, stride), stride, out);
}
