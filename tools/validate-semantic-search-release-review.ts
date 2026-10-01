import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  semanticSearchReleaseReviewSchema,
  semanticSearchReviewQuerySetSchema,
} from "../src/contracts/semantic-search-review.js";

const root = process.cwd();
const sha256 = (content: Uint8Array | string): string => createHash("sha256").update(content).digest("hex");
const [queryRaw, manifestRaw, reviewRaw, orderedIdsRaw] = await Promise.all([
  readFile(resolve(root, "data/curated/semantic-search-release-review-queries.json")),
  readFile(resolve(root, "data/generated/semantic-search-release.json")),
  readFile(resolve(root, "data/review/semantic-search-release-review.json")),
  readFile(resolve(root, "public/search/compact-minilm/ordered-component-ids.json"), "utf8"),
]);
const querySet = semanticSearchReviewQuerySetSchema.parse(JSON.parse(queryRaw.toString("utf8")) as unknown);
const review = semanticSearchReleaseReviewSchema.parse(JSON.parse(reviewRaw.toString("utf8")) as unknown);
const indexedIds = new Set(JSON.parse(orderedIdsRaw) as string[]);

assert.equal(review.querySetSha256, sha256(queryRaw));
assert.equal(review.releaseManifestSha256, sha256(manifestRaw));
assert.equal(review.cases.length, querySet.cases.length);
assert.equal(review.cases.filter(({ split }) => split === "development").length, 20);
assert.equal(review.cases.filter(({ split }) => split === "holdout").length, 10);
assert(review.cases.every(({ candidates }) => candidates.every(({ relevance }) => relevance === null)));

let developmentCandidateCount = 0;
for (const [index, reviewCase] of review.cases.entries()) {
  const queryCase = querySet.cases[index];
  assert(queryCase);
  assert.deepEqual(
    { caseId: reviewCase.caseId, split: reviewCase.split, language: reviewCase.language, role: reviewCase.role, query: reviewCase.query },
    queryCase,
  );
  const candidateIds = new Set(reviewCase.candidates.map(({ componentId }) => componentId));
  assert.equal(candidateIds.size, reviewCase.candidates.length);
  assert(reviewCase.candidates.every(({ componentId, categoryRole }) => indexedIds.has(componentId) && categoryRole === reviewCase.role));
  assert(reviewCase.systems.baseline.every((componentId) => candidateIds.has(componentId)));
  assert(reviewCase.systems.hybrid.every((componentId) => candidateIds.has(componentId)));
  assert(new Set(reviewCase.systems.baseline).size === reviewCase.systems.baseline.length);
  assert(new Set(reviewCase.systems.hybrid).size === reviewCase.systems.hybrid.length);
  for (const candidate of reviewCase.candidates) {
    await access(resolve(root, `public${candidate.thumbnailUrl}`));
  }
  if (reviewCase.split === "development") developmentCandidateCount += reviewCase.candidates.length;
}

console.log(JSON.stringify({
  message: "semantic search release relevance review valid",
  releaseDocumentCount: review.releaseDocumentCount,
  caseCount: review.cases.length,
  developmentCaseCount: 20,
  holdoutCaseCount: 10,
  developmentCandidateCount,
  labelsPresent: false,
  sourcePolicy: review.sourcePolicy,
}));

