/**
 * @file obj-mesh.ts
 * @description Parses the MakeHuman base OBJ (positions, UVs, grouped faces) and builds a
 *   triangulated render mesh for one group, splitting vertices at UV seams.
 * @scope cinelab-studio
 * @depends none
 */

export type ObjFace = { v: number[]; vt: number[] };

export type ObjData = {
  /** xyz per OBJ vertex, MakeHuman units (decimetres), Y up. */
  positions: Float32Array;
  /** uv per OBJ texture vertex. */
  uvs: Float32Array;
  groups: Map<string, ObjFace[]>;
};

/** Render mesh: `source[i]` is the OBJ vertex index of output vertex i. */
export type GroupMesh = {
  source: Uint32Array;
  uvs: Float32Array;
  indices: Uint32Array;
};

export function parseObj(text: string): ObjData {
  const positions: number[] = [];
  const uvs: number[] = [];
  const groups = new Map<string, ObjFace[]>();
  let faces: ObjFace[] = [];
  groups.set("default", faces);
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("v ")) {
      const [, x, y, z] = line.split(/\s+/);
      positions.push(Number(x), Number(y), Number(z));
    } else if (line.startsWith("vt ")) {
      const [, u, v] = line.split(/\s+/);
      uvs.push(Number(u), Number(v));
    } else if (line.startsWith("g ")) {
      const name = line.slice(2).trim();
      faces = groups.get(name) ?? [];
      groups.set(name, faces);
    } else if (line.startsWith("f ")) {
      const corners = line.split(/\s+/).slice(1).map((corner) => corner.split("/"));
      faces.push({
        v: corners.map(([v]) => Number(v) - 1),
        vt: corners.map(([, vt]) => (vt ? Number(vt) - 1 : -1)),
      });
    }
  }
  return { positions: Float32Array.from(positions), uvs: Float32Array.from(uvs), groups };
}

/** Sorted unique OBJ vertex indices used by a group's faces. */
export function groupVertices(obj: ObjData, group: string): number[] {
  const faces = obj.groups.get(group);
  if (!faces) throw new Error(`OBJ group not found: ${group}`);
  return [...new Set(faces.flatMap((face) => face.v))].sort((a, b) => a - b);
}

/** Triangulates a group (fan per polygon) and splits vertices that carry different UVs. */
export function buildGroupMesh(obj: ObjData, group: string): GroupMesh {
  const faces = obj.groups.get(group);
  if (!faces) throw new Error(`OBJ group not found: ${group}`);
  const keyToVertex = new Map<string, number>();
  const source: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const vertexFor = (v: number, vt: number) => {
    const key = `${v}/${vt}`;
    let index = keyToVertex.get(key);
    if (index === undefined) {
      index = source.length;
      keyToVertex.set(key, index);
      source.push(v);
      // glTF puts the UV origin top-left; OBJ puts it bottom-left.
      uvs.push(vt >= 0 ? obj.uvs[vt * 2] : 0, vt >= 0 ? 1 - obj.uvs[vt * 2 + 1] : 0);
    }
    return index;
  };
  for (const face of faces) {
    const corners = face.v.map((v, i) => vertexFor(v, face.vt[i]));
    for (let i = 1; i + 1 < corners.length; i += 1) indices.push(corners[0], corners[i], corners[i + 1]);
  }
  return { source: Uint32Array.from(source), uvs: Float32Array.from(uvs), indices: Uint32Array.from(indices) };
}
