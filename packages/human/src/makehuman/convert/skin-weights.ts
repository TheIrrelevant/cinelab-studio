/**
 * @file skin-weights.ts
 * @description Converts MakeHuman per-bone vertex weights into glTF JOINTS_0/WEIGHTS_0: the four
 *   strongest bones per render vertex, normalised to sum 1. Unweighted vertices bind to bone 0.
 * @scope cinelab-studio
 * @depends none
 */

export type WeightsJson = { weights: Record<string, Array<[number, number]>> };

export type SkinAttributes = {
  joints: Uint16Array;
  weights: Float32Array;
  /** Render vertices that had no weight and were bound fully to bone 0. */
  unweighted: number;
};

/**
 * @param source OBJ vertex index per render vertex.
 * @param boneNames Bone order of the skin; JOINTS_0 values index into it.
 */
export function buildSkin(source: ArrayLike<number>, boneNames: string[], json: WeightsJson): SkinAttributes {
  const perVertex = new Map<number, Array<[number, number]>>();
  boneNames.forEach((bone, boneIndex) => {
    for (const [vertex, weight] of json.weights[bone] ?? []) {
      if (weight <= 0) continue;
      const list = perVertex.get(vertex) ?? [];
      list.push([boneIndex, weight]);
      perVertex.set(vertex, list);
    }
  });
  const joints = new Uint16Array(source.length * 4);
  const weights = new Float32Array(source.length * 4);
  let unweighted = 0;
  for (let i = 0; i < source.length; i += 1) {
    const top = (perVertex.get(source[i]) ?? []).sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (top.length === 0) {
      weights[i * 4] = 1;
      unweighted += 1;
      continue;
    }
    const total = top.reduce((sum, [, weight]) => sum + weight, 0);
    top.forEach(([bone, weight], slot) => {
      joints[i * 4 + slot] = bone;
      weights[i * 4 + slot] = weight / total;
    });
  }
  return { joints, weights, unweighted };
}
