import { z } from "zod";

const stableId = z
  .string()
  .min(1)
  .max(180)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u, "IDs must be stable lowercase identifiers");

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
export const fitReviewResultSchema = z.enum(["fits", "does-not-fit", "inconclusive"]);
export const fitReviewEvidenceTypeSchema = z.enum(["physical-parts", "independent-fit-reference"]);

export const fitHumanDecisionInputSchema = z
  .object({
    caseId: stableId,
    result: fitReviewResultSchema,
    reviewerId: z.string().trim().min(2).max(100),
    evidenceType: fitReviewEvidenceTypeSchema,
    evidenceReference: z.string().trim().min(3).max(500),
    notes: z.string().trim().max(1_500),
  })
  .strict();

export const fitHumanDecisionSchema = fitHumanDecisionInputSchema
  .omit({ caseId: true })
  .extend({ reviewedAt: z.iso.datetime() })
  .strict();

export const fitHumanReviewProgressSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-05/FF-16-LDraw-human-review"),
    updatedAt: z.iso.datetime(),
    sourcePreflightSha256: sha256Schema,
    decisions: z.record(stableId, fitHumanDecisionSchema),
  })
  .strict();

const exportedCaseSchema = z
  .object({
    caseId: stableId,
    kind: z.enum([
      "head-on-reference-torso",
      "headwear-on-head",
      "accessory-in-reference-hand",
    ]),
    componentIds: z.array(stableId).min(1).max(2),
    slot: z.string().min(1).max(64),
    referenceFiles: z.array(z.string().min(1)).min(1),
    requiredChecks: z.array(z.string().min(1)).min(1),
    decision: fitHumanDecisionSchema,
  })
  .strict();

const exportedBlockedCaseSchema = z
  .object({
    caseId: stableId,
    kind: z.literal("torso-assembly-scope"),
    componentIds: z.array(stableId).min(1).max(2),
    status: z.literal("blocked-incomplete-assembly"),
    reason: z.string().min(1).max(600),
  })
  .strict();

export const fitHumanReviewExportSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-05/FF-16-LDraw-human-review"),
    sourcePreflightSha256: sha256Schema,
    completedAt: z.iso.datetime(),
    reviewStatus: z.literal("human-reviewed-pending-curation"),
    compatibilityMutation: z.literal("none"),
    publishable: z.literal(false),
    cases: z.array(exportedCaseSchema).length(18),
    blockedCases: z.array(exportedBlockedCaseSchema).length(1),
    summary: z
      .object({
        reviewedCaseCount: z.literal(18),
        blockedCaseCount: z.literal(1),
        fitsCount: z.number().int().min(0).max(18),
        doesNotFitCount: z.number().int().min(0).max(18),
        inconclusiveCount: z.number().int().min(0).max(18),
      })
      .strict(),
  })
  .strict()
  .superRefine((artifact, context) => {
    const total = artifact.summary.fitsCount + artifact.summary.doesNotFitCount + artifact.summary.inconclusiveCount;
    if (total !== artifact.summary.reviewedCaseCount) {
      context.addIssue({ code: "custom", path: ["summary"], message: "Review result counts must equal reviewed cases" });
    }
  });

export type FitHumanDecisionInput = z.infer<typeof fitHumanDecisionInputSchema>;
export type FitHumanReviewProgress = z.infer<typeof fitHumanReviewProgressSchema>;
export type FitHumanReviewExport = z.infer<typeof fitHumanReviewExportSchema>;
