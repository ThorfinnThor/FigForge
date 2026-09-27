import { z } from "zod";

const stableId = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u, "IDs must be stable lowercase identifiers");

const mappingStatusSchema = z.enum(["blocked", "pending", "unverified", "missing", "rejected"]);

export const mappingReviewItemSchema = z
  .object({
    id: stableId,
    entityType: z.enum(["component", "variant", "procurementRecipe"]),
    entityId: stableId,
    field: z.enum(["attachment", "procurement", "render", "humanReview", "release", "recipe"]),
    status: mappingStatusSchema,
    blocker: z.string().min(1).max(500),
    sourceIds: z.array(stableId).min(1),
    candidateIds: z.array(stableId),
  })
  .strict();

export const duplicateGroupSchema = z
  .object({
    id: stableId,
    kind: z.enum(["rebrickablePartNum", "variantSignature", "procurementRecipe"]),
    key: z.string().min(1).max(320),
    entityIds: z.array(stableId).min(2),
    status: z.enum(["review", "accepted", "rejected"]),
    note: z.string().min(1).max(500),
  })
  .strict();

export const mappingReviewSummarySchema = z
  .object({
    openMappingCount: z.number().int().nonnegative(),
    duplicateGroupCount: z.number().int().nonnegative(),
    blockedComponentCount: z.number().int().nonnegative(),
    blockedVariantCount: z.number().int().nonnegative(),
    unresolvedProcurementCount: z.number().int().nonnegative(),
    unresolvedAttachmentCount: z.number().int().nonnegative(),
    unresolvedRenderCount: z.number().int().nonnegative(),
    unresolvedHumanReviewCount: z.number().int().nonnegative(),
    unresolvedReleaseCount: z.number().int().nonnegative(),
    unresolvedRecipeCount: z.number().int().nonnegative(),
  })
  .strict();

export const mappingReviewSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-09"),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    sourceAssortmentSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    sourceLockSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    generatedFrom: z
      .object({
        componentCount: z.number().int().nonnegative(),
        variantCount: z.number().int().nonnegative(),
        recipeCount: z.number().int().nonnegative(),
      })
      .strict(),
    summary: mappingReviewSummarySchema,
    openMappings: z.array(mappingReviewItemSchema),
    duplicateGroups: z.array(duplicateGroupSchema),
    excludedSharedEvidenceIds: z.array(stableId),
    openBlockers: z.array(z.string().min(1).max(500)).min(1),
  })
  .strict();

export type MappingReviewItem = z.infer<typeof mappingReviewItemSchema>;
export type DuplicateGroup = z.infer<typeof duplicateGroupSchema>;
export type MappingReview = z.infer<typeof mappingReviewSchema>;
