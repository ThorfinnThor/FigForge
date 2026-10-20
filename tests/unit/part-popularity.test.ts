import { describe, expect, it } from "vitest";
import { comparePartsByPopularity, setCountsByPartNum } from "../../src/catalog/part-popularity.js";

describe("part popularity", () => {
  it("counts each part once per set, including repeated indexes", () => {
    const counts = setCountsByPartNum({
      parts: ["3626b", "973", "970"],
      sets: [
        { partIndexes: [0, 1, 1] },
        { partIndexes: [0] },
        { partIndexes: [0, 2] },
      ],
    });

    expect(counts.get("3626b")).toBe(3);
    expect(counts.get("973")).toBe(1);
    expect(counts.get("970")).toBe(1);
  });

  it("rejects an index that points outside the part table", () => {
    expect(() => setCountsByPartNum({ parts: ["3626b"], sets: [{ partIndexes: [4] }] })).toThrow(/unknown part index/u);
  });

  it("sorts by set count, then by natural part number, with missing counts last", () => {
    const parts = [
      { rebrickablePartNum: "973c10" },
      { rebrickablePartNum: "973c2", setCount: 5 },
      { rebrickablePartNum: "973c1", setCount: 5 },
      { rebrickablePartNum: "973c9", setCount: 40 },
    ];

    expect([...parts].sort(comparePartsByPopularity).map((part) => part.rebrickablePartNum))
      .toEqual(["973c9", "973c1", "973c2", "973c10"]);
  });
});
