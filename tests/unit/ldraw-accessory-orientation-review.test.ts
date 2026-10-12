import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import placementReviewsJson from "../../data/curated/ldraw-accessory-placement-reviews.json" with { type: "json" };
import reviewJson from "../../data/generated/ldraw-accessory-orientation-review.json" with { type: "json" };
import runtimeJson from "../../data/generated/ldraw-runtime/hand-accessory.json" with { type: "json" };
import { ldrawAccessoryOrientationReviewSchema } from "../../src/contracts/ldraw-accessory-orientation-review.js";

const review = ldrawAccessoryOrientationReviewSchema.parse(reviewJson);

describe("accessory orientation review queue", () => {
  it("covers every digitally connected hand accessory and preserves curated visual approvals", () => {
    expect(review.entries).toHaveLength(runtimeJson.entries.length);
    expect(review.summary.pendingReviewCount + review.summary.approvedReviewCount).toBe(review.entries.length);
    expect(review.summary.approvedReviewCount).toBe(placementReviewsJson.reviews.length);
    expect(
      review.entries
        .filter(({ reviewStatus }) => reviewStatus === "approved-browser-visual-review")
        .map(({ rebrickablePartNum }) => rebrickablePartNum)
        .sort(),
    ).toEqual(
      placementReviewsJson.reviews
        .map(({ rebrickablePartNum }) => rebrickablePartNum)
        .sort(),
    );
    expect(review.summary.highPriorityCount).toBeGreaterThan(0);
    expect(review.entries[0]?.priorityTier).toBe("high");
    expect(review.entries.map(({ queueRank }) => queueRank)).toEqual(
      review.entries.map((_, index) => index + 1),
    );
    expect(review.entries.find(({ rebrickablePartNum }) => rebrickablePartNum === "2530")).toMatchObject({
      reviewStatus: "approved-browser-visual-review",
      reviewer: "Codex Sol browser QA",
      reviewedAt: "2026-10-12",
    });
    expect(review.entries.every(({ reviewViews }) =>
      reviewViews.join(",") === "three-quarter,front,back",
    )).toBe(true);
  });

  it("is deterministically bound to generated runtime bytes", async () => {
    const raw = await readFile("data/generated/ldraw-accessory-orientation-review.json", "utf8");
    expect(review.sourceHashes.runtimePackageSha256).toBe(
      createHash("sha256").update(await readFile("data/generated/ldraw-runtime/hand-accessory.json")).digest("hex"),
    );
    expect(raw.endsWith("\n")).toBe(true);
  });
});
