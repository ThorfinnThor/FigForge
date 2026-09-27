import {
  fitHumanDecisionInputSchema,
  fitHumanReviewExportSchema,
  fitHumanReviewProgressSchema,
  type FitHumanDecisionInput,
  type FitHumanReviewProgress,
} from "../../src/contracts/ldraw-fit-human-review.js";
import type { LDrawFitReviewDocument } from "../../src/contracts/ldraw-fit-review.js";

type ThumbnailByComponent = ReadonlyMap<string, string>;

export function createFitHumanReviewProgress(sourcePreflightSha256: string): FitHumanReviewProgress {
  return {
    schemaVersion: 1,
    ticket: "FF-05/FF-16-LDraw-human-review",
    updatedAt: new Date(0).toISOString(),
    sourcePreflightSha256,
    decisions: {},
  };
}

export function applyFitHumanDecision(
  preflight: LDrawFitReviewDocument,
  progress: FitHumanReviewProgress,
  input: FitHumanDecisionInput,
  now = new Date(),
): FitHumanReviewProgress {
  const parsedInput = fitHumanDecisionInputSchema.parse(input);
  const reviewCase = preflight.reviewCases.find(({ id }) => id === parsedInput.caseId);
  if (!reviewCase) {
    throw new Error("Review case does not exist in the source preflight");
  }
  if (reviewCase.status !== "pending-human-fit-review") {
    throw new Error("Blocked review cases cannot receive a human fit decision");
  }
  const { caseId, ...decision } = parsedInput;
  return fitHumanReviewProgressSchema.parse({
    ...progress,
    updatedAt: now.toISOString(),
    decisions: {
      ...progress.decisions,
      [caseId]: { ...decision, reviewedAt: now.toISOString() },
    },
  });
}

export function buildFitHumanReviewState(
  preflight: LDrawFitReviewDocument,
  progress: FitHumanReviewProgress,
  thumbnailByComponent: ThumbnailByComponent = new Map(),
) {
  const componentById = new Map(preflight.entries.map((entry) => [entry.componentId, entry]));
  const cases = preflight.reviewCases
    .filter(({ status }) => status === "pending-human-fit-review")
    .map((reviewCase) => ({
      caseId: reviewCase.id,
      kind: reviewCase.kind,
      componentIds: reviewCase.componentIds,
      slot: reviewCase.slot,
      referenceFiles: reviewCase.referenceFiles,
      requiredChecks: reviewCase.requiredChecks,
      components: reviewCase.componentIds.map((componentId) => {
        const component = componentById.get(componentId);
        if (!component) {
          throw new Error(`Fit-review case references missing component ${componentId}`);
        }
        return {
          componentId,
          rebrickablePartNum: component.rebrickablePartNum,
          role: component.role,
          ldrawFile: component.ldrawFile,
          thumbnailUrl: thumbnailByComponent.get(componentId) ?? null,
        };
      }),
      decision: progress.decisions[reviewCase.id] ?? null,
    }));
  const reviewedCaseCount = cases.filter(({ decision }) => decision !== null).length;
  const blockedCases = preflight.reviewCases
    .filter(({ status }) => status === "blocked-incomplete-assembly")
    .map((reviewCase) => ({
      caseId: reviewCase.id,
      kind: reviewCase.kind,
      componentIds: reviewCase.componentIds,
      status: reviewCase.status,
      requiredChecks: reviewCase.requiredChecks,
    }));
  return {
    instructions: "Nur reale Teile oder eine unabhängig verlässliche Passformreferenz bewerten. LDraw-Nähe allein ist kein Passformnachweis.",
    totalCases: cases.length,
    reviewedCaseCount,
    complete: cases.length > 0 && reviewedCaseCount === cases.length,
    cases,
    blockedCases,
  };
}

export function buildFitHumanReviewExport(
  preflight: LDrawFitReviewDocument,
  progress: FitHumanReviewProgress,
) {
  const state = buildFitHumanReviewState(preflight, progress);
  if (!state.complete) {
    throw new Error("Human fit review is not complete");
  }
  const cases = preflight.reviewCases
    .filter(({ status }) => status === "pending-human-fit-review")
    .map((reviewCase) => {
      const decision = progress.decisions[reviewCase.id];
      if (!decision || reviewCase.kind === "torso-assembly-scope") {
        throw new Error(`Missing human fit decision for ${reviewCase.id}`);
      }
      return {
        caseId: reviewCase.id,
        kind: reviewCase.kind,
        componentIds: reviewCase.componentIds,
        slot: reviewCase.slot,
        referenceFiles: reviewCase.referenceFiles,
        requiredChecks: reviewCase.requiredChecks,
        decision,
      };
    });
  const blockedCases = preflight.reviewCases
    .filter(({ status }) => status === "blocked-incomplete-assembly")
    .map((reviewCase) => {
      const component = preflight.entries.find(({ componentId }) =>
        reviewCase.componentIds.includes(componentId),
      );
      return {
        caseId: reviewCase.id,
        kind: "torso-assembly-scope" as const,
        componentIds: reviewCase.componentIds,
        status: "blocked-incomplete-assembly" as const,
        reason: component?.humanReview.blocker ?? "Incomplete assembly remains blocked.",
      };
    });
  return fitHumanReviewExportSchema.parse({
    schemaVersion: 1,
    ticket: "FF-05/FF-16-LDraw-human-review",
    sourcePreflightSha256: progress.sourcePreflightSha256,
    completedAt: progress.updatedAt,
    reviewStatus: "human-reviewed-pending-curation",
    compatibilityMutation: "none",
    publishable: false,
    cases,
    blockedCases,
    summary: {
      reviewedCaseCount: cases.length,
      blockedCaseCount: blockedCases.length,
      fitsCount: cases.filter(({ decision }) => decision.result === "fits").length,
      doesNotFitCount: cases.filter(({ decision }) => decision.result === "does-not-fit").length,
      inconclusiveCount: cases.filter(({ decision }) => decision.result === "inconclusive").length,
    },
  });
}
