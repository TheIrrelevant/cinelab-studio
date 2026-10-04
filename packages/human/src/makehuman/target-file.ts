/**
 * @file target-file.ts
 * @description Parses MakeHuman `.target` text (`index dx dy dz` per line, `#` comments) into
 *   sparse vertex offsets. Pure function; reading and gunzipping the file is the caller's job.
 * @scope cinelab-studio
 * @depends none
 */

/** Sparse morph: `indices[i]` moves by `offsets[3i..3i+2]` (MakeHuman decimetre units). */
export type TargetOffsets = {
  indices: Uint32Array;
  offsets: Float32Array;
};

export class TargetParseError extends Error {
  constructor(line: number, text: string) {
    super(`Invalid target line ${line}: "${text}"`);
    this.name = "TargetParseError";
  }
}

export function parseTarget(text: string): TargetOffsets {
  const indices: number[] = [];
  const offsets: number[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line === "" || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    const values = parts.map(Number);
    const valid = parts.length === 4 && values.every(Number.isFinite) && Number.isInteger(values[0]) && values[0] >= 0;
    if (!valid) throw new TargetParseError(i + 1, line);
    indices.push(values[0]);
    offsets.push(values[1], values[2], values[3]);
  }
  return { indices: Uint32Array.from(indices), offsets: Float32Array.from(offsets) };
}
