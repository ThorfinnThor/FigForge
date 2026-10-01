import { z } from "zod";
import type { SemanticSearchReleaseReview } from "../../src/contracts/semantic-search-review.js";

export const releaseRelevanceRatingSchema = z.enum(["0", "1", "2"]);

export const releaseReviewProgressSchema = z.object({
  schemaVersion: z.literal(1),
  updatedAt: z.iso.datetime(),
  sourceReviewSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  ratings: z.record(z.string().min(1), releaseRelevanceRatingSchema),
}).strict();

export type ReleaseReviewProgress = z.infer<typeof releaseReviewProgressSchema>;
export type ReleaseRelevanceRating = z.infer<typeof releaseRelevanceRatingSchema>;

export function createReleaseReviewProgress(sourceReviewSha256: string): ReleaseReviewProgress {
  return {
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
    sourceReviewSha256,
    ratings: {},
  };
}

const developmentCandidates = (review: SemanticSearchReleaseReview) => review.cases
  .filter(({ split }) => split === "development")
  .flatMap(({ candidates }) => candidates);

export function applyReleaseReviewRating(
  review: SemanticSearchReleaseReview,
  progress: ReleaseReviewProgress,
  candidateKey: string,
  relevance: ReleaseRelevanceRating,
  now = new Date(),
): ReleaseReviewProgress {
  releaseRelevanceRatingSchema.parse(relevance);
  if (!developmentCandidates(review).some((candidate) => candidate.candidateKey === candidateKey)) {
    throw new Error("Candidate is not part of the visible development review");
  }
  return releaseReviewProgressSchema.parse({
    ...progress,
    updatedAt: now.toISOString(),
    ratings: { ...progress.ratings, [candidateKey]: relevance },
  });
}

export function buildReleaseReviewState(
  review: SemanticSearchReleaseReview,
  progress: ReleaseReviewProgress,
) {
  const cases = review.cases
    .filter(({ split }) => split === "development")
    .map(({ caseId, language, role, query, candidates }) => ({
      caseId,
      language,
      role,
      query,
      candidates: candidates.map((candidate) => ({
        candidateKey: candidate.candidateKey,
        componentId: candidate.componentId,
        rebrickablePartNum: candidate.rebrickablePartNum,
        originalName: candidate.originalName,
        categoryRole: candidate.categoryRole,
        colorNames: candidate.colorNames,
        thumbnailUrl: candidate.thumbnailUrl,
        relevance: progress.ratings[candidate.candidateKey] ?? null,
      })),
    }));
  const totalCandidates = cases.reduce((sum, reviewCase) => sum + reviewCase.candidates.length, 0);
  const ratedCandidates = cases.reduce(
    (sum, reviewCase) => sum + reviewCase.candidates.filter(({ relevance }) => relevance !== null).length,
    0,
  );
  return {
    instructions: review.instructions,
    split: "development" as const,
    cases,
    totalCases: cases.length,
    totalCandidates,
    ratedCandidates,
    complete: totalCandidates > 0 && ratedCandidates === totalCandidates,
  };
}

export function buildReleaseReviewExport(
  review: SemanticSearchReleaseReview,
  progress: ReleaseReviewProgress,
) {
  const state = buildReleaseReviewState(review, progress);
  if (!state.complete) throw new Error("Development review is not complete");
  return {
    schemaVersion: 1,
    sourceReviewSha256: progress.sourceReviewSha256,
    completedAt: progress.updatedAt,
    split: "development" as const,
    reviewStatus: "human-reviewed" as const,
    cases: state.cases,
  };
}

const discountedGain = (relevance: number, rank: number): number => (
  (2 ** relevance - 1) / Math.log2(rank + 2)
);

function scoreRun(
  componentIds: readonly string[],
  relevanceById: ReadonlyMap<string, number>,
): { ndcgAt5: number; successAt5: number } {
  const gains = componentIds.slice(0, 5).map((componentId) => relevanceById.get(componentId) ?? 0);
  const dcg = gains.reduce((sum, relevance, rank) => sum + discountedGain(relevance, rank), 0);
  const ideal = [...relevanceById.values()].sort((left, right) => right - left).slice(0, 5);
  const idcg = ideal.reduce((sum, relevance, rank) => sum + discountedGain(relevance, rank), 0);
  return {
    ndcgAt5: idcg === 0 ? 0 : dcg / idcg,
    successAt5: gains.some((relevance) => relevance >= 1) ? 1 : 0,
  };
}

export function buildReleaseReviewReport(
  review: SemanticSearchReleaseReview,
  progress: ReleaseReviewProgress,
) {
  const exported = buildReleaseReviewExport(review, progress);
  const exportedByCase = new Map(exported.cases.map((reviewCase) => [reviewCase.caseId, reviewCase]));
  const scoredCases = review.cases
    .filter(({ split }) => split === "development")
    .map((reviewCase) => {
      const judged = exportedByCase.get(reviewCase.caseId);
      if (!judged) throw new Error(`Missing reviewed case ${reviewCase.caseId}`);
      const relevanceById = new Map(judged.candidates.map(({ componentId, relevance }) => [componentId, Number(relevance)]));
      const fulfillable = [...relevanceById.values()].some((relevance) => relevance >= 1);
      return {
        caseId: reviewCase.caseId,
        language: reviewCase.language,
        fulfillable,
        baseline: scoreRun(reviewCase.systems.baseline, relevanceById),
        hybrid: scoreRun(reviewCase.systems.hybrid, relevanceById),
      };
    });
  const aggregate = (cases: typeof scoredCases) => {
    const fulfillable = cases.filter((reviewCase) => reviewCase.fulfillable);
    const average = (system: "baseline" | "hybrid", metric: "ndcgAt5" | "successAt5") => (
      fulfillable.length === 0
        ? null
        : fulfillable.reduce((sum, reviewCase) => sum + reviewCase[system][metric], 0) / fulfillable.length
    );
    return {
      caseCount: cases.length,
      fulfillableCaseCount: fulfillable.length,
      unfulfillableCaseCount: cases.length - fulfillable.length,
      baseline: { ndcgAt5: average("baseline", "ndcgAt5"), successAt5: average("baseline", "successAt5") },
      hybrid: { ndcgAt5: average("hybrid", "ndcgAt5"), successAt5: average("hybrid", "successAt5") },
    };
  };
  return {
    schemaVersion: 1,
    sourceReviewSha256: progress.sourceReviewSha256,
    completedAt: progress.updatedAt,
    split: "development" as const,
    metrics: "nDCG@5 and Success@5; human relevance levels 0/1/2" as const,
    overall: aggregate(scoredCases),
    byLanguage: {
      de: aggregate(scoredCases.filter(({ language }) => language === "de")),
      en: aggregate(scoredCases.filter(({ language }) => language === "en")),
    },
    cases: scoredCases,
  };
}

