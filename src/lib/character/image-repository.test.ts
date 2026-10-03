/**
 * @file image-repository.test.ts
 * @description Unit tests for the reference image storage (localStorage data URLs).
 * @scope cinelab-studio
 * @depends image-repository.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { imageRepository } from "@/lib/character/image-repository";
import { StorageWriteError } from "@/lib/character/storage-error";

let uuid = 0;
beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("crypto", { ...crypto, randomUUID: () => `uuid-${++uuid}` });
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

describe("imageRepository lifecycle and failures", () => {
  it("deleteMany removes only the listed images in one write", () => {
    const a = imageRepository.save("data:image/png;base64,AAA");
    const b = imageRepository.save("data:image/png;base64,BBB");
    const c = imageRepository.save("data:image/png;base64,CCC");
    expect(imageRepository.deleteMany([a, c, "missing"])).toBe(2);
    expect(imageRepository.list()).toEqual([b]);
    expect(imageRepository.deleteMany([])).toBe(0);
  });

  it("throws StorageWriteError when the quota is exceeded", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    try {
      expect(() => imageRepository.save("data:image/png;base64,AAA")).toThrow(StorageWriteError);
    } finally {
      setItem.mockRestore();
    }
    expect(imageRepository.list()).toEqual([]);
  });

  it("clear tolerates unavailable storage", () => {
    const removeItem = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    try {
      expect(() => imageRepository.clear()).not.toThrow();
    } finally {
      removeItem.mockRestore();
    }
  });
});
