import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import compatibility from "../../data/curated/ff16-compatibility-matrix.json" with { type: "json" };
import fitReviewJson from "../../data/generated/ldraw-fit-review.json" with { type: "json" };
import { ldrawFitReviewSchema } from "../../src/contracts/ldraw-fit-review.js";

const fitReview = ldrawFitReviewSchema.parse(fitReviewJson);
const sha256 = (content: string): string => createHash("sha256").update(content).digest("hex");

describe("official LDraw fit-review preflight", () => {
  it("measures all ten verified models without claiming physical fit", () => {
    expect(fitReview.summary).toEqual({
      entryCount: 10,
      readyForHumanReviewCount: 9,
      blockedEntryCount: 1,
      pendingCaseCount: 18,
      blockedCaseCount: 1,
      verifiedFitCount: 0,
    });
    expect(fitReview.publishable).toBe(false);
    for (const entry of fitReview.entries) {
      expect(entry.geometry.meshCount).toBeGreaterThan(0);
      expect(entry.geometry.triangleCount).toBeGreaterThan(0);
      expect(entry.geometry.boundsLdu.size.every((dimension) => dimension > 0)).toBe(true);
      expect(entry.compatibilityDecision).toBe("blocked");
      expect(entry.humanReview.reviewer).toBeNull();
    }
  });

  it("keeps accessories unattached and blocks the incomplete torso assembly", () => {
    const accessories = fitReview.entries.filter(({ role }) => role === "handAccessory");
    expect(accessories).toHaveLength(3);
    expect(accessories.every(({ placement }) =>
      placement.mode === "separate-unattached-inspection" && placement.transformLdu === null,
    )).toBe(true);

    const torso = fitReview.entries.find(({ componentId }) => componentId === "ff03-torso-3814");
    expect(torso?.preflightStatus).toBe("blocked-incomplete-assembly");
    expect(torso?.humanReview.status).toBe("blocked");
    expect(torso?.humanReview.blocker).toContain("973.dat");
  });

  it("enumerates every required human review case while FF-16 stays blocked", () => {
    expect(fitReview.reviewCases.filter(({ kind }) => kind === "head-on-reference-torso")).toHaveLength(3);
    expect(fitReview.reviewCases.filter(({ kind }) => kind === "headwear-on-head")).toHaveLength(9);
    expect(fitReview.reviewCases.filter(({ kind }) => kind === "accessory-in-reference-hand")).toHaveLength(6);
    expect(fitReview.reviewCases.filter(({ kind }) => kind === "torso-assembly-scope")).toHaveLength(1);

    const reviewedIds = new Set(fitReview.entries.map(({ componentId }) => componentId));
    const rules = compatibility.componentRules.filter(({ componentId }) => reviewedIds.has(componentId));
    expect(rules).toHaveLength(10);
    expect(rules.every(({ decision }) => decision === "blocked")).toBe(true);
  });

  it("is deterministically bound to the generated JSON bytes", async () => {
    const raw = await readFile("data/generated/ldraw-fit-review.json", "utf8");
    expect(sha256(`${JSON.stringify(fitReviewJson, null, 2)}\n`)).toBe(sha256(raw));
  });
});
