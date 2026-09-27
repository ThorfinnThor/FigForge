import { describe, expect, it } from "vitest";
import { dcgAtK, ndcgAtK, successAtK } from "../../src/search/benchmark-metrics.js";
import { rankSemanticIndex } from "../../src/search/semantic-index.js";

describe("FF-18 semantic index contracts", () => {
  it("rejects model/index profile mismatches", () => {
    expect(() => rankSemanticIndex(
      { profileId: "compact-minilm", dimension: 2, orderedComponentIds: ["part-a"], values: new Float32Array([1, 0]) },
      { profileId: "quality-e5", values: new Float32Array([1, 0]) },
    )).toThrow(/Model\/index mismatch/u);
  });

  it("ranks normalized vectors by dot-product similarity", () => {
    const hits = rankSemanticIndex(
      { profileId: "quality-e5", dimension: 2, orderedComponentIds: ["part-a", "part-b"], values: new Float32Array([1, 0, 0, 1]) },
      { profileId: "quality-e5", values: new Float32Array([0.8, 0.2]) },
    );
    expect(hits.map(({ componentId }) => componentId)).toEqual(["part-a", "part-b"]);
  });

  it("computes nDCG and Success without inventing labels", () => {
    expect(dcgAtK([2, 1, 0], 3)).toBeCloseTo(3 + 1 / Math.log2(3));
    expect(ndcgAtK([1, 2, 0], 3)).toBeLessThan(1);
    expect(successAtK([0, 0, 1], 2)).toBe(0);
    expect(successAtK([0, 1, 0], 2)).toBe(1);
  });
});
