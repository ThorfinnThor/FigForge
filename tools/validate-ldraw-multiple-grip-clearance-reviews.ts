import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { catalogPackageSchema } from "../src/contracts/catalog-package.js";
import { handGripEvidenceFromLDCadShadow, vendoredAccessoryGripFiles } from "./lib/ldcad-shadow-connectivity.js";
import { readAccessoryGripIntentReviews } from "./lib/ldraw-accessory-grip-intent-reviews.js";
import { readAccessoryPlacementReviews } from "./lib/ldraw-accessory-placement-reviews.js";
import { readAccessoryProfileReviews } from "./lib/ldraw-accessory-profile-reviews.js";
import { readMultipleGripClearanceReviews } from "./lib/ldraw-multiple-grip-clearance-reviews.js";
import { normalizeCatalogEvidenceName } from "./lib/ldraw-review.js";

const root = process.cwd();
const reviews = await readMultipleGripClearanceReviews(root);
const intentReviews = await readAccessoryGripIntentReviews(root);
const placementReviews = await readAccessoryPlacementReviews(root);
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
  digitalPlacementRejections: Array<{
    rebrickablePartNum: string;
    reasonCode: string;
    collisionSampleCount: number;
    safeGripCandidatesFound: number;
  }>;
};
const expandedByPartNum = new Map(expanded.entries
  .filter(({ role }) => role === "handAccessory")
  .map((entry) => [entry.rebrickablePartNum, entry]));
const rejectionByPartNum = new Map(expanded.digitalPlacementRejections
  .map((entry) => [entry.rebrickablePartNum, entry]));
const placement = JSON.parse(await readFile(
  resolve(root, "data/generated/ldraw-placement-candidates.json"),
  "utf8",
)) as {
  summary: { multipleRadius4CandidateCount: number };
  placementCandidates: Array<{ rebrickablePartNum: string; analysis: string }>;
};
const remainingMultiple = new Set(placement.placementCandidates
  .filter(({ analysis }) => analysis === "multiple-radius-4-cylinder-candidates")
  .map(({ rebrickablePartNum }) => rebrickablePartNum));
const intentBlockedPartNums = new Set(intentReviews.reviews.map(({ rebrickablePartNum }) => rebrickablePartNum));
const placementBlockedPartNums = new Set(placementReviews.reviews
  .filter(({ decision }) => decision === "blocked")
  .map(({ rebrickablePartNum }) => rebrickablePartNum));
const placementApprovedPartNums = new Set(placementReviews.reviews
  .filter(({ decision }) => decision === "approved")
  .map(({ rebrickablePartNum }) => rebrickablePartNum));
const remainingPlacementApprovedPartNums = new Set(
  [...remainingMultiple].filter((partNum) => placementApprovedPartNums.has(partNum)),
);

assert.equal(reviews.reviews.length, 8);
assert.equal(new Set(reviews.reviews.map(({ rebrickablePartNum }) => rebrickablePartNum)).size, 8);
const passed = reviews.reviews.filter(({ expectedResult }) => expectedResult === "passed");
const blocked = reviews.reviews.filter(({ expectedResult }) => expectedResult === "blocked");
assert.equal(passed.length, 4);
assert.equal(blocked.length, 4);

for (const review of reviews.reviews) {
  assert.equal(
    normalizeCatalogEvidenceName(catalogNames.get(review.rebrickablePartNum) ?? ""),
    normalizeCatalogEvidenceName(review.catalogName),
  );
  assert((vendoredAccessoryGripFiles as readonly string[]).includes(review.gripEvidenceFile));
  const shadowSource = await readFile(resolve(root, "data/vendor/ldcad-shadow", review.gripEvidenceFile), "utf8");
  const evidence = handGripEvidenceFromLDCadShadow(review.gripEvidenceFile, shadowSource);
  assert.equal(evidence.length, 1, `Expected one documented grip for ${review.rebrickablePartNum}`);
  const entry = expandedByPartNum.get(review.rebrickablePartNum);
  if (placementBlockedPartNums.has(review.rebrickablePartNum)) {
    assert(!entry, `Visually blocked multiple grip became builder-ready: ${review.rebrickablePartNum}`);
    assert.equal(rejectionByPartNum.get(review.rebrickablePartNum)?.reasonCode, "visually-implausible-placement");
    assert(remainingMultiple.has(review.rebrickablePartNum));
    continue;
  }
  if (intentBlockedPartNums.has(review.rebrickablePartNum)) {
    assert(!entry, `Semantically blocked multiple grip became builder-ready: ${review.rebrickablePartNum}`);
    const rejection = rejectionByPartNum.get(review.rebrickablePartNum);
    assert.equal(rejection?.reasonCode, "detected-feature-is-not-intended-hand-grip");
    assert.equal(rejection?.collisionSampleCount, 0);
    assert.equal(rejection?.safeGripCandidatesFound, 1);
    // Intent-blocked parts remain in the placement queue until a reviewed
    // placement profile exists; they are excluded from the builder catalog,
    // not removed from the evidence-backed follow-up queue.
    assert(remainingMultiple.has(review.rebrickablePartNum));
    continue;
  }
  if (review.expectedResult === "passed") {
    assert(entry, `Reviewed multiple grip is not builder-ready: ${review.rebrickablePartNum}`);
    assert.equal(entry.ldrawFile, review.ldrawFile);
    assert.equal(entry.geometryFallback, null);
    assert.equal(entry.digitalValidation?.clearanceMode, "closed-mesh");
    assert.equal(entry.digitalValidation?.collisionSampleCount, 0);
    assert.equal(entry.digitalValidation?.gripCandidatesTested, 1);
    assert.equal(entry.digitalValidation?.safeGripCandidatesFound, 1);
    assert.equal(entry.digitalValidation?.gripEvidenceSource, "ldcad-shadow-snap");
    assert.equal(entry.digitalValidation?.gripPrimitive, evidence[0]?.primitive);
    assert.equal(entry.digitalValidation?.physicalFitGuaranteed, false);
    if (remainingPlacementApprovedPartNums.has(review.rebrickablePartNum)) {
      assert(remainingMultiple.has(review.rebrickablePartNum));
    } else {
      assert(!remainingMultiple.has(review.rebrickablePartNum));
    }
  } else {
    assert(!entry, `Blocked multiple grip became builder-ready: ${review.rebrickablePartNum}`);
    const rejection = rejectionByPartNum.get(review.rebrickablePartNum);
    assert.equal(rejection?.reasonCode, "reference-figure-clearance-failed");
    assert((rejection?.collisionSampleCount ?? 0) > 0);
    assert.equal(rejection?.safeGripCandidatesFound, 0);
    assert(remainingMultiple.has(review.rebrickablePartNum));
  }
}

assert.equal(placement.summary.multipleRadius4CandidateCount, remainingMultiple.size);
const remainingWithoutReviewedGrip = [...remainingMultiple].filter((partNum) =>
  !blocked.some((review) => review.rebrickablePartNum === partNum)
    && !intentBlockedPartNums.has(partNum)
    && !placementBlockedPartNums.has(partNum)
    && !remainingPlacementApprovedPartNums.has(partNum)
);
// ADR-047: all 3846 profile members were multi-grip parts and left the candidate queue when
// the project profile placed them. The original 99 unreviewed parts stay unreviewed.
const profileMemberCount = (await readAccessoryProfileReviews(root)).families
  .reduce((total, { members }) => total + members.length, 0);
assert.equal(
  remainingWithoutReviewedGrip.length + profileMemberCount,
  99,
);

console.log(JSON.stringify({
  message: "reviewed multiple-grip LDCad clearance valid",
  reviewed: reviews.reviews.length,
  passed: passed.filter(({ rebrickablePartNum }) => (
    !intentBlockedPartNums.has(rebrickablePartNum) && !placementBlockedPartNums.has(rebrickablePartNum)
  )).length,
  intentBlocked: passed.filter(({ rebrickablePartNum }) => intentBlockedPartNums.has(rebrickablePartNum)).length,
  placementBlocked: passed.filter(({ rebrickablePartNum }) => placementBlockedPartNums.has(rebrickablePartNum)).length,
  blocked: blocked.length,
  remainingWithoutUniqueDocumentedGrip: remainingWithoutReviewedGrip.length,
  sourcePolicy: reviews.sourcePolicy,
}));
