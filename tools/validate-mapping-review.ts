import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ff06ProcurementDatasetSchema } from "../src/contracts/procurement.js";
import { mappingReviewSchema } from "../src/contracts/mapping-review.js";
import { sourceLockSchema } from "../src/contracts/source-lock.js";
import { testAssortmentSchema } from "../src/contracts/test-assortment.js";
import { buildMappingReview } from "./mapping-review.js";

const readJson = async (relativePath: string): Promise<unknown> =>
  JSON.parse(await readFile(resolve(process.cwd(), relativePath), "utf8")) as unknown;

const assortmentPath = resolve(process.cwd(), "data/curated/ff03-test-assortment.json");
const sourceLockPath = resolve(process.cwd(), "data/sources.lock.json");
const assortmentContent = await readFile(assortmentPath, "utf8");
const sourceLockContent = await readFile(sourceLockPath, "utf8");
const assortment = testAssortmentSchema.parse(JSON.parse(assortmentContent) as unknown);
const procurement = ff06ProcurementDatasetSchema.parse(
  await readJson("data/curated/ff06-procurement-recipes.json"),
);
const sourceLock = sourceLockSchema.parse(JSON.parse(sourceLockContent) as unknown);
const report = mappingReviewSchema.parse(await readJson("data/generated/mapping-review.json"));
const sourceAssortmentSha256 = createHash("sha256").update(assortmentContent).digest("hex");
const sourceLockSha256 = createHash("sha256").update(sourceLockContent).digest("hex");

assert.equal(report.sourceAssortmentSha256, sourceAssortmentSha256, "Mapping report is stale for FF-03 assortment");
assert.equal(report.sourceLockSha256, sourceLockSha256, "Mapping report is stale for source lock");
assert.equal(report.sourcePolicy, "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.");
assert.equal(sourceLock.sources[0].apiUsed, false);
assert(report.openMappings.every(({ candidateIds }) => candidateIds.length === 0), "Unverified mappings must not guess candidates");
assert(
  report.duplicateGroups.every(({ entityIds }) => new Set(entityIds).size === entityIds.length),
  "Duplicate groups must not repeat entity IDs",
);
assert(
  report.excludedSharedEvidenceIds.every((evidenceId) => evidenceId.startsWith("evidence:category:")),
  "Only intentionally shared category evidence may be excluded from duplicate checks",
);

const expected = buildMappingReview({
  assortment,
  procurement,
  sourceAssortmentSha256,
  sourceLockSha256,
});
assert.deepEqual(report, expected, "Mapping review is not deterministic or is out of date");

console.log(JSON.stringify({ message: "FF-09 mapping review valid", ...report.summary }));
