/**
 * @file binary-builder.ts
 * @description Appends typed arrays into one little-endian buffer, each section 4-byte aligned,
 *   and reports byte offsets. Shared by the GLB writer and the morph pack.
 * @scope cinelab-studio
 * @depends none
 */

export class BinaryBuilder {
  private parts: Uint8Array[] = [];
  private length = 0;

  /** Appends the bytes of `view` and returns their offset. */
  append(view: ArrayBufferView): { offset: number; length: number } {
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    const offset = this.length;
    this.parts.push(bytes);
    this.length += bytes.byteLength;
    const pad = (4 - (this.length % 4)) % 4;
    if (pad) {
      this.parts.push(new Uint8Array(pad));
      this.length += pad;
    }
    return { offset, length: bytes.byteLength };
  }

  get byteLength(): number {
    return this.length;
  }

  toBytes(): Uint8Array {
    const out = new Uint8Array(this.length);
    let cursor = 0;
    for (const part of this.parts) {
      out.set(part, cursor);
      cursor += part.byteLength;
    }
    return out;
  }
}
