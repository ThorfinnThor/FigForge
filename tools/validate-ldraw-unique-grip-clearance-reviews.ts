import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { catalogPackageSchema } from "../src/contracts/catalog-package.js";
import { readMultipleGripClearanceReviews } from "./lib/ldraw-multiple-grip-clearance-reviews.js";
import { readNoRadiusGripClearanceReviews } from "./lib/ldraw-no-radius-grip-clearance-reviews.js";
import { readUniqueGripClearanceReviews } from "./lib/ldraw-unique-grip-clearance-reviews.js";

const root = process.cwd();
const reviews = await readUniqueGripClearanceReviews(root);
const multipleGripReviews = await readMultipleGripClearanceReviews(root);
const noRadiusGripReviews = await readNoRadiusGripClearanceReviews(root);
const catalogSource: unknown = JSON.parse(await readFile(
  resolve(root, "data/generated/catalog-packages/hand-accessory.json"),
  "utf8",
));
const catalog = catalogPackageSchema.parse(catalogSource);
const catalogNames = new Map(catalog.parts.map((part) => [part.rebrickablePartNum, part.name]));

const expanded = JSON.parse(await readFile(resolve(root, "data/generated/ldraw-expanded-catalog.json"), "utf8")) as {
  entries: Array<{
    role: string;
    rebrickablePartNum: string;
    ldrawFile: string;
    geometryFallback: unknown;
    digitalValidation: null | {
      status: string;
      collisionSampleCount: number;
      clearanceMode?: string;
      physicalFitGuaranteed: boolean;
    };
  }>;
  digitalPlacementRejections: Array<{
    rebrickablePartNum: string;
    ldrawFile: string;
    reasonCode: string;
  }>;
};
const expandedByPartNum = new Map(expanded.entries
  .filter(({ role }) => role === "handAccessory")
  .map((entry) => [entry.rebrickablePartNum, entry]));
const rejectionByPartNum = new Map(expanded.digitalPlacementRejections.map((entry) => [entry.rebrickablePartNum, entry]));

const coverage = JSON.parse(await readFile(resolve(root, "data/generated/ldraw-catalog-coverage.json"), "utf8")) as {
  remainingEntries: Array<{
    role: string;
    rebrickablePartNum: string;
    classification: string;
    ldrawFiles: string[];
  }>;
};
const remainingByPartNum = new Map(coverage.remainingEntries
  .filter(({ role }) => role === "handAccessory")
  .map((entry) => [entry.rebrickablePartNum, entry]));

const placement = JSON.parse(await readFile(resolve(root, "data/generated/ldraw-placement-candidates.json"), "utf8")) as {
  summary: { uniqueRadius4CandidateCount: number };
  placementCandidates: Array<{
    role: string;
    rebrickablePartNum: string;
    analysis: string;
  }>;
};
const remainingUnique = new Set(placement.placementCandidates
  .filter(({ role, analysis }) => role === "handAccessory" && analysis === "unique-radius-4-cylinder-candidate")
  .map(({ rebrickablePartNum }) => rebrickablePartNum));

assert.equal(reviews.reviews.length, 20);
assert.equal(new Set(reviews.reviews.map(({ rebrickablePartNum }) => rebrickablePartNum)).size, 20);
const passed = reviews.reviews.filter(({ expectedResult }) => expectedResult === "passed");
const blocked = reviews.reviews.filter(({ expectedResult }) => expectedResult === "blocked");
assert.equal(passed.length, 7);
assert.equal(blocked.length, 13);

for (const review of reviews.reviews) {
  assert.equal(catalogNames.get(review.rebrickablePartNum), review.catalogName);
  assert(review.ldrawFile.startsWith("parts/") && !review.ldrawFile.toLowerCase().includes("moc"));
  const entry = expandedByPartNum.get(review.rebrickablePartNum);
  if (review.expectedResult === "passed") {
    assert(entry, `Reviewed unique grip is not builder-ready: ${review.rebrickablePartNum}`);
    assert.equal(entry.ldrawFile, review.ldrawFile);
    assert.equal(entry.geometryFallback, null);
    assert.equal(entry.digitalValidation?.status, "passed");
    assert.equal(entry.digitalValidation?.collisionSampleCount, 0);
    assert.equal(entry.digitalValidation?.clearanceMode, "closed-mesh");
    assert.equal(entry.digitalValidation?.physicalFitGuaranteed, false);
    assert(!remainingUnique.has(review.rebrickablePartNum));
  } else {
    assert(!entry, `Blocked unique grip became builder-ready: ${review.rebrickablePartNum}`);
    const remaining = remainingByPartNum.get(review.rebrickablePartNum);
    assert.equal(remaining?.classification, "placement-profile-required");
    assert.deepEqual(remaining?.ldrawFiles, [review.ldrawFile]);
    assert(rejectionByPartNum.has(review.rebrickablePartNum));
    assert(remainingUnique.has(review.rebrickablePartNum));
  }
}

const closedMeshEntries = expanded.entries.filter(({ digitalValidation }) =>
  digitalValidation?.clearanceMode === "closed-mesh"
);
assert.deepEqual(
  new Set(closedMeshEntries.map(({ rebrickablePartNum }) => rebrickablePartNum)),
  new Set([
    ...passed.map(({ rebrickablePartNum }) => rebrickablePartNum),
    ...multipleGripReviews.reviews
      .filter(({ expectedResult }) => expectedResult === "passed")
      .map(({ rebrickablePartNum }) => rebrickablePartNum),
    ...noRadiusGripReviews.reviews
      .filter(({ expectedResult }) => expectedResult === "passed")
      .map(({ rebrickablePartNum }) => rebrickablePartNum),
  ]),
);
assert.equal(placement.summary.uniqueRadius4CandidateCount, blocked.length);
assert.deepEqual(remainingUnique, new Set(blocked.map(({ rebrickablePartNum }) => rebrickablePartNum)));

console.log(JSON.stringify({
  message: "reviewed unique-grip closed-mesh clearance valid",
  reviewed: reviews.reviews.length,
  passed: passed.length,
  blocked: blocked.length,
  sourcePolicy: reviews.sourcePolicy,
}));
