import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import reviewJson from "../../data/generated/ldraw-accessory-orientation-review.json" with { type: "json" };
import runtimeJson from "../../data/generated/ldraw-runtime/hand-accessory.json" with { type: "json" };
import { ldrawAccessoryOrientationReviewSchema } from "../../src/contracts/ldraw-accessory-orientation-review.js";

const review = ldrawAccessoryOrientationReviewSchema.parse(reviewJson);

describe("accessory orientation review queue", () => {
  it("covers every digitally connected hand accessory without approving visual fit", () => {
    expect(review.entries).toHaveLength(runtimeJson.entries.length);
    expect(review.summary.pendingReviewCount).toBe(review.entries.length);
    expect(review.entries.every(({ reviewStatus, reviewer }) =>
      reviewStatus === "pending-human-visual-review" && reviewer === null,
    )).toBe(true);
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
