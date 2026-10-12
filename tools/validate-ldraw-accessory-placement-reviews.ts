import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readAccessoryPlacementReviews } from "./lib/ldraw-accessory-placement-reviews.js";

const root = process.cwd();
const reviews = await readAccessoryPlacementReviews(root);
const catalog = JSON.parse(await readFile(
  resolve(root, "data/generated/ldraw-expanded-catalog.json"),
  "utf8",
)) as {
  entries: Array<{
    rebrickablePartNum: string;
    ldrawFile: string;
    digitalValidation?: {
      gripLengthLdu: number;
      gripCandidatesTested: number;
      orientationCandidatesTested: number;
      selectedGripCandidateIndex: number;
      selectedOrientationIndex: number;
      gripPrimitive: string;
      collisionSampleCount: number;
    };
  }>;
};
const seen = new Set<string>();

for (const review of reviews.reviews) {
  const key = review.rebrickablePartNum.trim().toLowerCase();
  if (!key || seen.has(key)) throw new Error(`Duplicate or empty accessory-placement review: ${review.rebrickablePartNum}`);
  seen.add(key);
  if (
    review.decision !== "approved"
    || !review.catalogName.trim()
    || !review.ldrawFile.startsWith("parts/")
    || !review.detectedGripPrimitive.trim()
    || review.detectedGripLengthLdu <= 0
    || review.gripCandidatesTested <= 0
    || review.orientationCandidatesTested <= 0
    || review.selectedGripCandidateIndex < 0
    || review.selectedGripCandidateIndex >= review.gripCandidatesTested
    || review.selectedOrientationIndex < 0
    || review.selectedOrientationIndex >= review.orientationCandidatesTested
    || !/^\d{4}-\d{2}-\d{2}$/u.test(review.reviewedAt)
    || !review.reviewer.trim()
    || !review.evidenceReference.trim()
    || !review.note.trim()
  ) {
    throw new Error(`Invalid accessory-placement review: ${review.rebrickablePartNum}`);
  }
  const generated = catalog.entries.find(({ rebrickablePartNum }) =>
    rebrickablePartNum.trim().toLowerCase() === key
  );
  const validation = generated?.digitalValidation;
  if (
    generated?.ldrawFile !== review.ldrawFile
    || validation?.gripPrimitive !== review.detectedGripPrimitive
    || validation.gripLengthLdu !== review.detectedGripLengthLdu
    || validation.gripCandidatesTested !== review.gripCandidatesTested
    || validation.orientationCandidatesTested !== review.orientationCandidatesTested
    || validation.selectedGripCandidateIndex !== review.selectedGripCandidateIndex
    || validation.selectedOrientationIndex !== review.selectedOrientationIndex
    || validation.collisionSampleCount !== 0
  ) {
    throw new Error(`Generated catalog does not implement accessory-placement review: ${review.rebrickablePartNum}`);
  }
}

console.log(`Validated ${reviews.reviews.length} curated accessory-placement review(s).`);
