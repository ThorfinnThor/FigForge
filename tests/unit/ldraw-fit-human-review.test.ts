import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import preflightJson from "../../data/generated/ldraw-fit-review.json" with { type: "json" };
import { fitHumanReviewExportSchema } from "../../src/contracts/ldraw-fit-human-review.js";
import { ldrawFitReviewSchema } from "../../src/contracts/ldraw-fit-review.js";
import {
  applyFitHumanDecision,
  buildFitHumanReviewExport,
  buildFitHumanReviewState,
  createFitHumanReviewProgress,
} from "../../tools/lib/ldraw-fit-human-review.js";

const preflight = ldrawFitReviewSchema.parse(preflightJson);
const sourceHash = "a".repeat(64);

describe("local LDraw human fit review", () => {
  it("starts with 18 unanswered cases and keeps the incomplete torso blocked", () => {
    const progress = createFitHumanReviewProgress(sourceHash);
    const state = buildFitHumanReviewState(preflight, progress);

    expect(state.totalCases).toBe(18);
    expect(state.reviewedCaseCount).toBe(0);
    expect(state.complete).toBe(false);
    expect(state.blockedCases).toHaveLength(1);
    expect(state.blockedCases[0]?.kind).toBe("torso-assembly-scope");
    expect(() => buildFitHumanReviewExport(preflight, progress)).toThrow(/not complete/u);
  });

  it("accepts only pending source cases with concrete reviewer evidence", () => {
    const progress = createFitHumanReviewProgress(sourceHash);
    const pendingCase = preflight.reviewCases.find(({ status }) => status === "pending-human-fit-review");
    const blockedCase = preflight.reviewCases.find(({ status }) => status === "blocked-incomplete-assembly");
    if (!pendingCase || !blockedCase) {
      throw new Error("Expected pending and blocked fit-review fixtures");
    }
    const reviewed = applyFitHumanDecision(preflight, progress, {
      caseId: pendingCase.id,
      result: "inconclusive",
      reviewerId: "reviewer-1",
      evidenceType: "physical-parts",
      evidenceReference: "fixture-photo-001.jpg",
      notes: "Unit-test decision only.",
    }, new Date("2026-09-27T20:00:00Z"));
    expect(reviewed.decisions[pendingCase.id]?.result).toBe("inconclusive");
    expect(progress.decisions).toEqual({});
    expect(() => applyFitHumanDecision(preflight, progress, {
      caseId: blockedCase.id,
      result: "fits",
      reviewerId: "reviewer-1",
      evidenceType: "physical-parts",
      evidenceReference: "fixture-photo-002.jpg",
      notes: "",
    })).toThrow(/Blocked review cases/u);
  });

  it("exports only a complete non-publishable review without mutating FF-16", () => {
    let progress = createFitHumanReviewProgress(sourceHash);
    const pendingCases = preflight.reviewCases.filter(({ status }) => status === "pending-human-fit-review");
    const results = ["fits", "does-not-fit", "inconclusive"] as const;
    for (const [index, reviewCase] of pendingCases.entries()) {
      progress = applyFitHumanDecision(preflight, progress, {
        caseId: reviewCase.id,
        result: results[index % results.length] ?? "inconclusive",
        reviewerId: "reviewer-1",
        evidenceType: index % 2 === 0 ? "physical-parts" : "independent-fit-reference",
        evidenceReference: `evidence-${String(index + 1).padStart(2, "0")}`,
        notes: "Unit-test decision only.",
      }, new Date(`2026-09-27T20:${String(index).padStart(2, "0")}:00Z`));
    }
    const artifact = fitHumanReviewExportSchema.parse(buildFitHumanReviewExport(preflight, progress));

    expect(artifact.cases).toHaveLength(18);
    expect(artifact.blockedCases).toHaveLength(1);
    expect(artifact.summary).toEqual({
      reviewedCaseCount: 18,
      blockedCaseCount: 1,
      fitsCount: 6,
      doesNotFitCount: 6,
      inconclusiveCount: 6,
    });
    expect(artifact.compatibilityMutation).toBe("none");
    expect(artifact.reviewStatus).toBe("human-reviewed-pending-curation");
    expect(artifact.publishable).toBe(false);
  });

  it("binds the server to localhost and applies restrictive local UI boundaries", async () => {
    const [serverSource, reviewLibrarySource, htmlSource] = await Promise.all([
      readFile("tools/ldraw-fit-review-server.ts", "utf8"),
      readFile("tools/lib/ldraw-fit-human-review.ts", "utf8"),
      readFile("tools/fit-review-ui/index.html", "utf8"),
    ]);

    expect(serverSource).toContain('const host = "127.0.0.1"');
    expect(serverSource).toContain("frame-ancestors 'none'");
    expect(reviewLibrarySource).toContain('compatibilityMutation: "none"');
    expect(htmlSource).toContain("LDraw-Geometrie allein ist kein physischer Passformnachweis");
    expect(htmlSource).toContain('aria-disabled="true"');
  });
});
