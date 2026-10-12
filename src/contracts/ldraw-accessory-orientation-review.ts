import { z } from "zod";
import { matrix4Schema } from "./catalog.js";

const stableId = z
  .string()
  .min(1)
  .max(180)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u);
const componentIdSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^catalog:handAccessory:[a-z0-9._:-]+$/u);

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const reviewViewSchema = z.enum(["three-quarter", "front", "back"]);
const priorityTierSchema = z.enum(["high", "medium", "standard"]);
const riskFlagSchema = z.enum([
  "non-default-orientation",
  "long-accessory-extent",
  "multiple-grip-candidates",
]);

const entrySchema = z
  .object({
    id: stableId,
    componentId: componentIdSchema,
    rebrickablePartNum: z.string().min(1).max(80),
    name: z.string().min(1).max(300),
    ldrawFile: z.string().startsWith("parts/"),
    modelUrl: z.string().startsWith("/assets/"),
    thumbnailUrl: z.string().startsWith("/assets/"),
    placementMode: z.literal("snap-connector"),
    placementTransformLdu: matrix4Schema,
    digitalValidation: z
      .object({
        status: z.literal("passed"),
        selectedOrientationIndex: z.number().int().nonnegative(),
        orientationCandidatesTested: z.number().int().positive(),
        collisionSampleCount: z.number().int().nonnegative(),
        gripCandidatesTested: z.number().int().positive(),
        gripLengthLdu: z.number().positive(),
        gripPrimitive: z.string().min(1).max(160),
      })
      .strict(),
    reviewViews: z.array(reviewViewSchema).length(3),
    riskFlags: z.array(riskFlagSchema),
    priorityScore: z.number().int().positive(),
    priorityTier: priorityTierSchema,
    queueRank: z.number().int().positive(),
    reviewStatus: z.enum(["pending-human-visual-review", "approved-browser-visual-review"]),
    requiredChecks: z.array(z.string().min(1).max(300)).min(3),
    reviewer: z.string().min(1).max(120).nullable(),
    reviewedAt: z.iso.date().nullable(),
    evidenceReference: z.string().min(1).max(300).nullable(),
  })
  .strict();

export const ldrawAccessoryOrientationReviewSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-ACCESSORY-ORIENTATION"),
    generatedAt: z.iso.date(),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    publishable: z.literal(false),
    sourceHashes: z
      .object({
        runtimePackageSha256: sha256Schema,
        expandedCatalogSha256: sha256Schema,
      })
      .strict(),
    entries: z.array(entrySchema).min(1),
    summary: z
      .object({
        entryCount: z.number().int().positive(),
        pendingReviewCount: z.number().int().nonnegative(),
        approvedReviewCount: z.number().int().nonnegative(),
        nonDefaultOrientationCount: z.number().int().nonnegative(),
        longAccessoryExtentCount: z.number().int().nonnegative(),
        multipleGripCandidateCount: z.number().int().nonnegative(),
        highPriorityCount: z.number().int().nonnegative(),
        mediumPriorityCount: z.number().int().nonnegative(),
      })
      .strict(),
    limitations: z.array(z.string().min(1).max(800)).min(2),
  })
  .strict()
  .superRefine((document, context) => {
    if (document.summary.entryCount !== document.entries.length) {
      context.addIssue({ code: "custom", path: ["summary", "entryCount"], message: "Entry count is stale" });
    }
    if (document.summary.pendingReviewCount !== document.entries.filter(({ reviewStatus }) => reviewStatus === "pending-human-visual-review").length) {
      context.addIssue({ code: "custom", path: ["summary", "pendingReviewCount"], message: "Pending review count is stale" });
    }
    if (document.summary.approvedReviewCount !== document.entries.filter(({ reviewStatus }) => reviewStatus === "approved-browser-visual-review").length) {
      context.addIssue({ code: "custom", path: ["summary", "approvedReviewCount"], message: "Approved review count is stale" });
    }
    const ids = document.entries.map(({ componentId }) => componentId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", path: ["entries"], message: "Review queue component IDs must be unique" });
    }
    const derivedTier = (score: number): "high" | "medium" | "standard" =>
      score >= 3 ? "high" : score === 2 ? "medium" : "standard";
    for (const [index, entry] of document.entries.entries()) {
      const expectedScore = 1
        + (entry.riskFlags.includes("non-default-orientation") ? 1 : 0)
        + (entry.riskFlags.includes("long-accessory-extent") ? 1 : 0)
        + (entry.riskFlags.includes("multiple-grip-candidates") ? 2 : 0);
      if (entry.priorityScore !== expectedScore || entry.priorityTier !== derivedTier(expectedScore) || entry.queueRank !== index + 1) {
        context.addIssue({ code: "custom", path: ["entries", index], message: "Priority metadata is stale" });
      }
      const pending = entry.reviewStatus === "pending-human-visual-review";
      if (
        (pending && (entry.reviewer !== null || entry.reviewedAt !== null || entry.evidenceReference !== null))
        || (!pending && (entry.reviewer === null || entry.reviewedAt === null || entry.evidenceReference === null))
      ) {
        context.addIssue({ code: "custom", path: ["entries", index], message: "Review evidence does not match review status" });
      }
    }
    for (const entry of document.entries) {
      if (entry.reviewViews.join(",") !== "three-quarter,front,back") {
        context.addIssue({ code: "custom", path: ["entries"], message: "Review views must be in canonical order" });
        break;
      }
    }
  });

export type LDrawAccessoryOrientationReviewDocument = z.infer<typeof ldrawAccessoryOrientationReviewSchema>;
