import { describe, expect, it } from "vitest";
import type { SemanticSearchReleaseReview } from "../../src/contracts/semantic-search-review.js";
import {
  applyReleaseReviewRating,
  buildReleaseReviewExport,
  buildReleaseReviewReport,
  buildReleaseReviewState,
  createReleaseReviewProgress,
} from "../../tools/lib/semantic-search-release-review.js";

const candidate = (componentId: string) => ({
  candidateKey: `candidate:dev:${componentId}`,
  componentId,
  rebrickablePartNum: componentId,
  originalName: componentId,
  categoryRole: "head" as const,
  colorNames: ["Yellow"],
  thumbnailUrl: `/assets/thumbnails/${componentId}.webp`,
  relevance: null,
});

const review = {
  instructions: "Human review",
  cases: [
    {
      caseId: "dev",
      split: "development" as const,
      language: "en" as const,
      role: "head" as const,
      query: "alien",
      systems: { baseline: ["a", "b"], hybrid: ["b", "a"] },
      candidates: [candidate("a"), candidate("b")],
    },
    {
      caseId: "holdout",
      split: "holdout" as const,
      language: "de" as const,
      role: "head" as const,
      query: "geheim",
      systems: { baseline: ["c"], hybrid: ["c"] },
      candidates: [{ ...candidate("c"), candidateKey: "candidate:holdout:c" }],
    },
  ],
} as SemanticSearchReleaseReview;

describe("semantic search release relevance review", () => {
  it("hides holdout cases and system origins from the browser state", () => {
    const state = buildReleaseReviewState(review, createReleaseReviewProgress("a".repeat(64)));
    expect(state.cases).toHaveLength(1);
    expect(state.cases[0]).not.toHaveProperty("systems");
    expect(JSON.stringify(state)).not.toContain("holdout");
  });

  it("exposes only holdout cases after the development tuning is frozen", () => {
    const state = buildReleaseReviewState(review, createReleaseReviewProgress("a".repeat(64)), "holdout");
    expect(state.split).toBe("holdout");
    expect(state.cases.map(({ caseId }) => caseId)).toEqual(["holdout"]);
    expect(state.cases[0]).not.toHaveProperty("systems");
    expect(JSON.stringify(state)).not.toContain('"caseId":"dev"');
  });

  it("rejects ratings outside the visible development split", () => {
    const progress = createReleaseReviewProgress("a".repeat(64));
    expect(() => applyReleaseReviewRating(review, progress, "candidate:holdout:c", "2")).toThrow(/not part/u);
  });

  it("keeps holdout ratings separate from development progress", () => {
    let progress = createReleaseReviewProgress("a".repeat(64));
    expect(() => applyReleaseReviewRating(
      review,
      progress,
      "candidate:dev:a",
      "2",
      new Date("2026-10-02T09:00:00Z"),
      "holdout",
    )).toThrow(/not part/u);
    progress = applyReleaseReviewRating(
      review,
      progress,
      "candidate:holdout:c",
      "2",
      new Date("2026-10-02T09:01:00Z"),
      "holdout",
    );
    const report = buildReleaseReviewReport(review, progress, "holdout");
    expect(report.split).toBe("holdout");
    expect(report.overall.hybrid.ndcgAt5).toBe(1);
  });

  it("exports only a complete review and computes deterministic metrics", () => {
    let progress = createReleaseReviewProgress("a".repeat(64));
    expect(() => buildReleaseReviewExport(review, progress)).toThrow(/not complete/u);
    progress = applyReleaseReviewRating(review, progress, "candidate:dev:a", "0", new Date("2026-10-01T16:00:00Z"));
    progress = applyReleaseReviewRating(review, progress, "candidate:dev:b", "2", new Date("2026-10-01T16:01:00Z"));
    const report = buildReleaseReviewReport(review, progress);
    expect(report.overall.fulfillableCaseCount).toBe(1);
    expect(report.overall.hybrid.successAt5).toBe(1);
    expect(report.overall.hybrid.ndcgAt5).toBeGreaterThan(report.overall.baseline.ndcgAt5 ?? 0);
  });
});
