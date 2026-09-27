import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import procurementFixture from "../../data/curated/ff06-procurement-recipes.json" with { type: "json" };
import assortmentFixture from "../../data/curated/ff03-test-assortment.json" with { type: "json" };
import sourceLockFixture from "../../data/sources.lock.json" with { type: "json" };
import { ff06ProcurementDatasetSchema } from "../../src/contracts/procurement.js";
import { mappingReviewSchema } from "../../src/contracts/mapping-review.js";
import { testAssortmentSchema } from "../../src/contracts/test-assortment.js";
import { buildMappingReview } from "../../tools/mapping-review.js";

const assortment = testAssortmentSchema.parse(assortmentFixture);
const procurement = ff06ProcurementDatasetSchema.parse(procurementFixture);
const sourceLock = sourceLockFixture;

describe("FF-09 mapping review", () => {
  it("reports all current blockers without inventing candidate mappings", async () => {
    const assortmentContent = await readFile("data/curated/ff03-test-assortment.json", "utf8");
    const sourceLockContent = await readFile("data/sources.lock.json", "utf8");
    const report = buildMappingReview({
      assortment,
      procurement,
      sourceAssortmentSha256: createHash("sha256").update(assortmentContent).digest("hex"),
      sourceLockSha256: createHash("sha256").update(sourceLockContent).digest("hex"),
    });

    expect(mappingReviewSchema.parse(report)).toEqual(report);
    expect(report.summary).toMatchObject({
      openMappingCount: 133,
      duplicateGroupCount: 0,
      blockedComponentCount: 17,
      blockedVariantCount: 20,
      unresolvedProcurementCount: 37,
      unresolvedAttachmentCount: 17,
      unresolvedRenderCount: 37,
      unresolvedHumanReviewCount: 17,
      unresolvedReleaseCount: 20,
      unresolvedRecipeCount: 5,
    });
    expect(report.openMappings.every(({ candidateIds }) => candidateIds.length === 0)).toBe(true);
    expect(report.excludedSharedEvidenceIds).toEqual([
      "evidence:category:59",
      "evidence:category:60",
      "evidence:category:61",
      "evidence:category:65",
      "evidence:category:73",
    ]);
    expect(sourceLock.sources[0]!.apiUsed).toBe(false);
  });

  it("flags duplicate part numbers, variant signatures, and recipe records", () => {
    const duplicateAssortment = structuredClone(assortment);
    duplicateAssortment.components.push({ ...duplicateAssortment.components[0]!, id: "ff03-head-duplicate" });
    duplicateAssortment.variants.push({ ...duplicateAssortment.variants[0]!, id: "ff03-variant-duplicate" });
    const duplicateProcurement = structuredClone(procurement);
    duplicateProcurement.recipes.push({ ...duplicateProcurement.recipes[0]!, id: "recipe:ff06:duplicate" });

    const report = buildMappingReview({
      assortment: duplicateAssortment,
      procurement: duplicateProcurement,
      sourceAssortmentSha256: "a".repeat(64),
      sourceLockSha256: "b".repeat(64),
    });

    expect(report.duplicateGroups.map(({ kind }) => kind)).toEqual([
      "procurementRecipe",
      "rebrickablePartNum",
      "variantSignature",
    ]);
    expect(report.duplicateGroups.every(({ status }) => status === "review")).toBe(true);
  });
});
