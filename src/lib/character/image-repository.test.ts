/**
 * @file image-repository.test.ts
 * @description Unit tests for the reference image storage (localStorage data URLs).
 * @scope cinelab-studio
 * @depends image-repository.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { imageRepository } from "@/lib/character/image-repository";

beforeEach(() => {
  window.localStorage.clear();
});

describe("imageRepository", () => {
  it("save returns a generated id and getImage retrieves the data url", () => {
    const id = imageRepository.save("data:image/png;base64,AAA");
    expect(id).toBeTypeOf("string");
    expect(id.length).toBeGreaterThan(0);
    expect(imageRepository.get(id)).toBe("data:image/png;base64,AAA");
  });

  it("get returns null for unknown id", () => {
    expect(imageRepository.get("nope")).toBeNull();
  });

  it("delete removes an image", () => {
    const id = imageRepository.save("data:image/png;base64,BBB");
    expect(imageRepository.delete(id)).toBe(true);
    expect(imageRepository.get(id)).toBeNull();
    expect(imageRepository.delete(id)).toBe(false);
  });

  it("saveMany / list returns stored ids", () => {
    const a = imageRepository.save("data:image/png;base64,AAA");
    const b = imageRepository.save("data:image/png;base64,BBB");
    expect(imageRepository.list()).toEqual(expect.arrayContaining([a, b]));
  });
});