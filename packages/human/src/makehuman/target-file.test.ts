/**
 * @file target-file.test.ts
 * @description Tests the MakeHuman target parser on inline samples.
 * @scope cinelab-studio
 * @depends ./target-file
 */

import { describe, expect, it } from "vitest";
import { parseTarget, TargetParseError } from "./target-file";

describe("parseTarget", () => {
  it("reads index and offset per line, skipping comments and blanks", () => {
    const result = parseTarget("# header\n0 .026 .154 -.166\n\n12 1 -2 0.5\n");
    expect(Array.from(result.indices)).toEqual([0, 12]);
    expect(Array.from(result.offsets)).toEqual([
      expect.closeTo(0.026), expect.closeTo(0.154), expect.closeTo(-0.166), 1, -2, 0.5,
    ]);
  });

  it("accepts CRLF line endings", () => {
    expect(Array.from(parseTarget("3 0 0 1\r\n4 0 1 0\r\n").indices)).toEqual([3, 4]);
  });

  it("rejects malformed lines with their line number", () => {
    expect(() => parseTarget("0 1 2 3\n1 2 x 4")).toThrow(TargetParseError);
    expect(() => parseTarget("0 1 2 3\n1 2 x 4")).toThrow(/line 2/);
    expect(() => parseTarget("1.5 0 0 0")).toThrow(TargetParseError);
    expect(() => parseTarget("-1 0 0 0")).toThrow(TargetParseError);
    expect(() => parseTarget("1 0 0")).toThrow(TargetParseError);
  });
});
