import { z } from "zod";

export const relevanceRatingSchema = z.enum(["0", "1", "2"]);

export const developmentProgressSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-18"),
    updatedAt: z.iso.datetime(),
    sourceReviewSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    ratings: z.record(z.string().min(1), relevanceRatingSchema),
  })
  .strict();

export interface ReviewCandidateLike {
  candidateKey: string;
  relevance: "0" | "1" | "2" | null;
  [key: string]: unknown;
}

export interface ReviewCaseLike {
  caseId: string;
  split: "development" | "holdout";
  query: string;
  candidates: ReviewCandidateLike[];
  [key: string]: unknown;
}

export interface ReviewLike {
  instructions: string;
  cases: ReviewCaseLike[];
}

export type DevelopmentProgress = z.infer<typeof developmentProgressSchema>;
export type RelevanceRating = z.infer<typeof relevanceRatingSchema>;

export function createDevelopmentProgress(sourceReviewSha256: string): DevelopmentProgress {
  return {
    schemaVersion: 1,
    ticket: "FF-18",
    updatedAt: new Date(0).toISOString(),
    sourceReviewSha256,
    ratings: {},
  };
}

export function applyDevelopmentRating(
  review: ReviewLike,
  progress: DevelopmentProgress,
  candidateKey: string,
  relevance: RelevanceRating,
  now = new Date(),
): DevelopmentProgress {
  relevanceRatingSchema.parse(relevance);
  const developmentCandidateKeys = new Set(
    review.cases
      .filter(({ split }) => split === "development")
      .flatMap(({ candidates }) => candidates.map((candidate) => candidate.candidateKey)),
  );
  if (!developmentCandidateKeys.has(candidateKey)) {
    throw new Error("Candidate is not part of the visible development review");
  }
  return developmentProgressSchema.parse({
    ...progress,
    updatedAt: now.toISOString(),
    ratings: { ...progress.ratings, [candidateKey]: relevance },
  });
}

export function buildDevelopmentState(review: ReviewLike, progress: DevelopmentProgress) {
  const cases = review.cases
    .filter(({ split }) => split === "development")
    .map((reviewCase) => ({
      ...reviewCase,
      candidates: reviewCase.candidates.map((candidate) => ({
        ...candidate,
        relevance: progress.ratings[candidate.candidateKey] ?? null,
      })),
    }));
  const totalCandidates = cases.reduce((total, reviewCase) => total + reviewCase.candidates.length, 0);
  const ratedCandidates = cases.reduce(
    (total, reviewCase) => total + reviewCase.candidates.filter(({ relevance }) => relevance !== null).length,
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

export function buildDevelopmentExport(review: ReviewLike, progress: DevelopmentProgress) {
  const state = buildDevelopmentState(review, progress);
  if (!state.complete) throw new Error("Development review is not complete");
  return {
    schemaVersion: 1,
    ticket: "FF-18",
    sourceReviewSha256: progress.sourceReviewSha256,
    completedAt: progress.updatedAt,
    split: "development",
    reviewStatus: "human-reviewed",
    cases: state.cases,
  };
}
