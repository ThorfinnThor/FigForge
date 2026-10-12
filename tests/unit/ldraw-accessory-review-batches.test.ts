import { describe, expect, it } from "vitest";
import reviewJson from "../../data/generated/ldraw-accessory-orientation-review.json" with { type: "json" };
import { ldrawAccessoryOrientationReviewSchema } from "../../src/contracts/ldraw-accessory-orientation-review.js";
import { createRiskReviewGroups } from "../../tools/lib/ldraw-accessory-review-batches.js";

describe("accessory review batches", () => {
  it("groups identical risky variants and excludes approved or low-risk entries", () => {
    const review = ldrawAccessoryOrientationReviewSchema.parse(reviewJson);
    const groups = createRiskReviewGroups(review.entries);
    const grouped = groups.flatMap(({ members }) => members);

    expect(grouped.every(({ reviewStatus, riskFlags }) =>
      reviewStatus === "pending-human-visual-review" && riskFlags.length > 0
    )).toBe(true);
    expect(new Set(grouped.map(({ componentId }) => componentId))).toHaveLength(grouped.length);
    expect(groups.length).toBeLessThanOrEqual(grouped.length);
    expect(groups.find(({ members }) => members.some(({ rebrickablePartNum }) =>
      rebrickablePartNum === "24108"
    ))).toBeUndefined();
  });
});
