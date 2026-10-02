import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { semanticSearchReleaseReviewSchema } from "../src/contracts/semantic-search-review.js";
import { releaseRelevanceRatingSchema, releaseReviewProgressSchema } from "./lib/semantic-search-release-review.js";

const judgmentsPathArgument = process.argv[2];
if (!judgmentsPathArgument) {
  throw new Error("Usage: npm run review:semantic-release:import -- /absolute/path/to/judgments.json");
}

const reviewPath = resolve(process.cwd(), "data/review/semantic-search-release-review.json");
const judgmentsPath = resolve(process.cwd(), judgmentsPathArgument);
const exportedJudgmentsSchema = z.object({
  schemaVersion: z.literal(1),
  sourceReviewSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  completedAt: z.iso.datetime(),
  split: z.enum(["development", "holdout"]),
  reviewStatus: z.literal("human-reviewed"),
  cases: z.array(z.object({
    caseId: z.string().min(1),
    candidates: z.array(z.object({
      candidateKey: z.string().min(1),
      componentId: z.string().min(1),
      relevance: releaseRelevanceRatingSchema,
    }).passthrough()),
  }).passthrough()),
}).strict();

const [reviewRaw, judgmentsRaw] = await Promise.all([
  readFile(reviewPath),
  readFile(judgmentsPath, "utf8"),
]);
const review = semanticSearchReleaseReviewSchema.parse(JSON.parse(reviewRaw.toString("utf8")) as unknown);
const judgments = exportedJudgmentsSchema.parse(JSON.parse(judgmentsRaw) as unknown);
const progressPath = resolve(
  process.cwd(),
  process.env.FIGFORGE_SEARCH_REVIEW_PROGRESS
    ?? `data/review/semantic-search-${judgments.split === "holdout" ? "holdout" : "release"}-progress.json`,
);
const sourceReviewSha256 = createHash("sha256").update(reviewRaw).digest("hex");
const importedByKey = new Map(judgments.cases.flatMap(({ candidates }) => (
  candidates.map(({ candidateKey, componentId, relevance }) => [candidateKey, { componentId, relevance }] as const)
)));
const ratings: Record<string, z.infer<typeof releaseRelevanceRatingSchema>> = {};
const splitCandidates = review.cases
  .filter(({ split }) => split === judgments.split)
  .flatMap(({ candidates }) => candidates);

for (const candidate of splitCandidates) {
  const imported = importedByKey.get(candidate.candidateKey);
  if (!imported) continue;
  if (imported.componentId !== candidate.componentId) {
    throw new Error(`Candidate identity changed for ${candidate.candidateKey}`);
  }
  ratings[candidate.candidateKey] = imported.relevance;
}

const progress = releaseReviewProgressSchema.parse({
  schemaVersion: 1,
  updatedAt: judgments.completedAt,
  sourceReviewSha256,
  ratings,
});
const temporaryPath = `${progressPath}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify(progress, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
await rename(temporaryPath, progressPath);

console.log(JSON.stringify({
  message: "semantic search release judgments imported",
  split: judgments.split,
  previousSourceReviewSha256: judgments.sourceReviewSha256,
  currentSourceReviewSha256: sourceReviewSha256,
  candidateCount: splitCandidates.length,
  carriedForwardRatingCount: Object.keys(ratings).length,
  remainingRatingCount: splitCandidates.length - Object.keys(ratings).length,
}));
