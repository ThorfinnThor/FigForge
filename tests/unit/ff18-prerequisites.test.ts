import { describe, expect, it } from "vitest";
import {
  ff18Prerequisites,
  inspectFf18Prerequisites,
} from "../../tools/lib/ff18-prerequisites.js";

describe("FF-18 prerequisite preflight", () => {
  it("fails closed when FF-21 inputs and human judgments are absent", async () => {
    const result = await inspectFf18Prerequisites("/repository", () => Promise.resolve(false));

    expect(result.readyForIndexBuild).toBe(false);
    expect(result.readyForBenchmarkDecision).toBe(false);
    expect(result.missing).toEqual(ff18Prerequisites.map(({ id }) => id));
  });

  it("does not permit a benchmark decision with search documents alone", async () => {
    const result = await inspectFf18Prerequisites(
      "/repository",
      (path) => Promise.resolve(path.endsWith("ff21-search-documents.json")),
    );

    expect(result.readyForIndexBuild).toBe(true);
    expect(result.readyForBenchmarkDecision).toBe(false);
    expect(result.missing).toEqual([
      "ff21-stratified-testset",
      "ff18-human-relevance-judgments",
    ]);
  });

  it("opens both gates only when every required artifact is present", async () => {
    const result = await inspectFf18Prerequisites("/repository", () => Promise.resolve(true));

    expect(result.readyForIndexBuild).toBe(true);
    expect(result.readyForBenchmarkDecision).toBe(true);
    expect(result.missing).toEqual([]);
  });
});
