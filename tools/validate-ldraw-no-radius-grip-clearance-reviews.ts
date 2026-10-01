import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { catalogPackageSchema } from "../src/contracts/catalog-package.js";
import { handGripEvidenceFromLDCadShadow, vendoredAccessoryGripFiles } from "./lib/ldcad-shadow-connectivity.js";
import { readNoRadiusGripClearanceReviews } from "./lib/ldraw-no-radius-grip-clearance-reviews.js";

const root = process.cwd();
const reviews = await readNoRadiusGripClearanceReviews(root);
const catalog = catalogPackageSchema.parse(JSON.parse(await readFile(
  resolve(root, "data/generated/catalog-packages/hand-accessory.json"),
  "utf8",
)) as unknown);
const catalogNames = new Map(catalog.parts.map((part) => [part.rebrickablePartNum, part.name]));
const expanded = JSON.parse(await readFile(resolve(root, "data/generated/ldraw-expanded-catalog.json"), "utf8")) as {
  entries: Array<{
    role: string;
    rebrickablePartNum: string;
    ldrawFile: string;
    geometryFallback: unknown;
    digitalValidation: null | {
      clearanceMode?: string;
      collisionSampleCount: number;
      gripCandidatesTested: number;
      safeGripCandidatesFound: number;
      gripEvidenceSource: string;
      gripPrimitive: string;
      physicalFitGuaranteed: boolean;
    };
  }>;
};
const expandedByPartNum = new Map(expanded.entries
  .filter(({ role }) => role === "handAccessory")
  .map((entry) => [entry.rebrickablePartNum, entry]));
const placement = JSON.parse(await readFile(
  resolve(root, "data/generated/ldraw-placement-candidates.json"),
  "utf8",
)) as {
  summary: { noRadius4CylinderDetectedCount: number };
  placementCandidates: Array<{ rebrickablePartNum: string; analysis: string }>;
};
const remainingNoRadius = new Set(placement.placementCandidates
  .filter(({ analysis }) => analysis === "no-radius-4-cylinder-detected")
  .map(({ rebrickablePartNum }) => rebrickablePartNum));

assert.equal(reviews.auditedQueueCount, 270);
assert.equal(reviews.uniqueDocumentedGripCount, 23);
assert.equal(reviews.withoutUniqueDocumentedGripCount, 247);
assert.equal(reviews.reviews.length, reviews.uniqueDocumentedGripCount);
assert.equal(new Set(reviews.reviews.map(({ rebrickablePartNum }) => rebrickablePartNum)).size, 23);
assert(reviews.reviews.every(({ expectedResult }) => expectedResult === "passed"));

for (const review of reviews.reviews) {
  assert.equal(catalogNames.get(review.rebrickablePartNum), review.catalogName);
  assert((vendoredAccessoryGripFiles as readonly string[]).includes(review.gripEvidenceFile));
  const shadowSource = await readFile(resolve(root, "data/vendor/ldcad-shadow", review.gripEvidenceFile), "utf8");
  const evidence = handGripEvidenceFromLDCadShadow(review.gripEvidenceFile, shadowSource);
  assert.equal(evidence.length, 1, `Expected one documented grip for ${review.rebrickablePartNum}`);
  const entry = expandedByPartNum.get(review.rebrickablePartNum);
  assert(entry, `Reviewed no-radius grip is not builder-ready: ${review.rebrickablePartNum}`);
  assert.equal(entry.ldrawFile, review.ldrawFile);
  assert.equal(entry.geometryFallback, null);
  assert.equal(entry.digitalValidation?.clearanceMode, "closed-mesh");
  assert.equal(entry.digitalValidation?.collisionSampleCount, 0);
  assert.equal(entry.digitalValidation?.gripCandidatesTested, 1);
  assert.equal(entry.digitalValidation?.safeGripCandidatesFound, 1);
  assert.equal(entry.digitalValidation?.gripEvidenceSource, "ldcad-shadow-snap");
  assert.equal(entry.digitalValidation?.gripPrimitive, evidence[0]?.primitive);
  assert.equal(entry.digitalValidation?.physicalFitGuaranteed, false);
  assert(!remainingNoRadius.has(review.rebrickablePartNum));
}

assert.equal(placement.summary.noRadius4CylinderDetectedCount, reviews.withoutUniqueDocumentedGripCount);
assert.equal(remainingNoRadius.size, reviews.withoutUniqueDocumentedGripCount);
assert.equal(reviews.reviews.length + remainingNoRadius.size, reviews.auditedQueueCount);

console.log(JSON.stringify({
  message: "reviewed no-radius LDCad clearance valid",
  audited: reviews.auditedQueueCount,
  documented: reviews.uniqueDocumentedGripCount,
  passed: reviews.reviews.length,
  remainingWithoutUniqueDocumentedGrip: remainingNoRadius.size,
  sourcePolicy: reviews.sourcePolicy,
}));
