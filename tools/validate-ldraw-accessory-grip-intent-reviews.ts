import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { catalogPackageSchema } from "../src/contracts/catalog-package.js";
import { readAccessoryGripIntentReviews } from "./lib/ldraw-accessory-grip-intent-reviews.js";
import { normalizeCatalogEvidenceName } from "./lib/ldraw-review.js";

const root = process.cwd();
const reviews = await readAccessoryGripIntentReviews(root);
const catalog = catalogPackageSchema.parse(JSON.parse(await readFile(
  resolve(root, "data/generated/catalog-packages/hand-accessory.json"),
  "utf8",
)) as unknown);
const names = new Map(catalog.parts.map((part) => [part.rebrickablePartNum, part.name]));
const expanded = JSON.parse(await readFile(
  resolve(root, "data/generated/ldraw-expanded-catalog.json"),
  "utf8",
)) as {
  entries: Array<{ role: string; rebrickablePartNum: string }>;
  digitalPlacementRejections: Array<{
    rebrickablePartNum: string;
    ldrawFile: string;
    reasonCode: string;
    safeGripCandidatesFound: number;
    selectedGripEvidence?: { primitive: string; lengthLdu: number };
  }>;
  summary: { accessorySemanticGripRejectionsExcluded: number };
};
const coverage = JSON.parse(await readFile(
  resolve(root, "data/generated/ldraw-catalog-coverage.json"),
  "utf8",
)) as {
  remainingEntries: Array<{
    role: string;
    rebrickablePartNum: string;
    classification: string;
    ldrawFiles: string[];
  }>;
};
const placement = JSON.parse(await readFile(
  resolve(root, "data/generated/ldraw-placement-candidates.json"),
  "utf8",
)) as {
  placementCandidates: Array<{
    role: string;
    rebrickablePartNum: string;
    analysis: string;
    evidence: Array<{ primitive: string; lengthLdu: number }>;
  }>;
};

assert(reviews.reviews.length > 0);
assert.equal(
  new Set(reviews.reviews.map(({ rebrickablePartNum }) => rebrickablePartNum)).size,
  reviews.reviews.length,
);
for (const review of reviews.reviews) {
  assert.equal(
    normalizeCatalogEvidenceName(names.get(review.rebrickablePartNum) ?? ""),
    normalizeCatalogEvidenceName(review.catalogName),
  );
  assert(review.ldrawFile.startsWith("parts/") && !review.ldrawFile.toLowerCase().includes("moc"));
  assert(review.detectedGripLengthLdu > 0);
  assert(!expanded.entries.some(({ role, rebrickablePartNum }) =>
    role === "handAccessory" && rebrickablePartNum === review.rebrickablePartNum
  ));
  assert(expanded.digitalPlacementRejections.some((rejection) =>
    rejection.rebrickablePartNum === review.rebrickablePartNum
      && rejection.ldrawFile === review.ldrawFile
      && rejection.reasonCode === review.reasonCode
      && rejection.safeGripCandidatesFound === 1
      && rejection.selectedGripEvidence?.primitive === review.detectedGripPrimitive
      && rejection.selectedGripEvidence.lengthLdu === review.detectedGripLengthLdu
  ));
  assert(coverage.remainingEntries.some((entry) =>
    entry.role === "handAccessory"
      && entry.rebrickablePartNum === review.rebrickablePartNum
      && entry.classification === "placement-profile-required"
      && entry.ldrawFiles.length === 1
      && entry.ldrawFiles[0] === review.ldrawFile
  ));
  const placementCandidate = placement.placementCandidates.find((entry) =>
    entry.role === "handAccessory"
      && entry.rebrickablePartNum === review.rebrickablePartNum
  );
  if (placementCandidate) {
    assert(
      placementCandidate.analysis === "unique-radius-4-cylinder-candidate"
        || placementCandidate.analysis === "multiple-radius-4-cylinder-candidates",
    );
    assert(placementCandidate.evidence.some((evidence) =>
      review.detectedGripPrimitive.startsWith("ldcad-shadow:")
        ? evidence.lengthLdu === review.detectedGripLengthLdu
        : evidence.primitive === review.detectedGripPrimitive
          && evidence.lengthLdu === review.detectedGripLengthLdu
    ));
  }
}
assert.equal(expanded.summary.accessorySemanticGripRejectionsExcluded, reviews.reviews.length);

console.log(JSON.stringify({
  message: "semantic accessory-grip intent reviews valid",
  reviewed: reviews.reviews.length,
  blocked: reviews.reviews.length,
  sourcePolicy: reviews.sourcePolicy,
}));
