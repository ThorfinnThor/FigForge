import { describe, expect, it } from "vitest";
import { rebrickableKeywordIds } from "../../tools/lib/ldraw-keywords.js";

describe("LDraw Rebrickable keywords", () => {
  it("reads a Rebrickable identifier that follows another keyword", () => {
    expect(rebrickableKeywordIds("0 !KEYWORDS Bricklink 973pb0006c01, Rebrickable 973c01h01pr0005, set 6641, town"))
      .toEqual(["973c01h01pr0005"]);
  });

  it("reads a Rebrickable identifier directly after the meta command", () => {
    expect(rebrickableKeywordIds("0 !KEYWORDS Rebrickable 973c27h01pr4792, Set 10278, Set 10303"))
      .toEqual(["973c27h01pr4792"]);
  });

  it("reads every Rebrickable identifier on one line", () => {
    expect(rebrickableKeywordIds("0 !KEYWORDS Rebrickable 3626cpr0001, Rebrickable 3626cpr0002"))
      .toEqual(["3626cpr0001", "3626cpr0002"]);
  });

  it.each([
    "0 Minifig Head Rebrickable 3626cpr0001",
    "0 !KEYWORDS Bricklink 973pb0006c01, set 6641",
    "0 !KEYWORDS Rebrickable-like 3626c",
    "0 !KEYWORDS Not Rebrickable 3626c",
  ])("ignores lines without a Rebrickable keyword entry: %s", (line) => {
    expect(rebrickableKeywordIds(line)).toEqual([]);
  });
});
