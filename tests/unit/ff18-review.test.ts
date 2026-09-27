import { describe, expect, it } from "vitest";
import {
  applyDevelopmentRating,
  buildDevelopmentExport,
  buildDevelopmentState,
  createDevelopmentProgress,
} from "../../tools/lib/ff18-review.js";

const review = {
  instructions: "Human review",
  cases: [
    { caseId: "dev", split: "development" as const, query: "head", candidates: [{ candidateKey: "candidate:dev:a", relevance: null }] },
    { caseId: "holdout", split: "holdout" as const, query: "hidden", candidates: [{ candidateKey: "candidate:holdout:b", relevance: null }] },
  ],
};

describe("FF-18 local review", () => {
  it("never exposes holdout cases in development state", () => {
    const state = buildDevelopmentState(review, createDevelopmentProgress("a".repeat(64)));
    expect(state.totalCases).toBe(1);
    expect(state.cases.map(({ caseId }) => caseId)).toEqual(["dev"]);
  });

  it("rejects attempts to rate a holdout candidate", () => {
    const progress = createDevelopmentProgress("a".repeat(64));
    expect(() => applyDevelopmentRating(review, progress, "candidate:holdout:b", "2")).toThrow(/not part/u);
  });

  it("autosave state becomes exportable only after completion", () => {
    const progress = createDevelopmentProgress("a".repeat(64));
    expect(() => buildDevelopmentExport(review, progress)).toThrow(/not complete/u);
    const rated = applyDevelopmentRating(review, progress, "candidate:dev:a", "2", new Date("2026-09-27T18:00:00Z"));
    const state = buildDevelopmentState(review, rated);
    expect(state.complete).toBe(true);
    expect(buildDevelopmentExport(review, rated).reviewStatus).toBe("human-reviewed");
  });
});
