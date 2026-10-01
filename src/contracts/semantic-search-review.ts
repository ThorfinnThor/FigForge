import { z } from "zod";
import { catalogRoleSchema } from "./catalog-package.js";

const sha256 = z.string().regex(/^[a-f0-9]{64}$/u);
const sourcePolicy = z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.");
const splitSchema = z.enum(["development", "holdout"]);
const languageSchema = z.enum(["de", "en"]);

export const semanticSearchReviewQuerySetSchema = z.object({
  schemaVersion: z.literal(1),
  updatedAt: z.iso.datetime(),
  sourcePolicy,
  reviewStatus: z.literal("curated-queries-human-relevance-pending"),
  cases: z.array(z.object({
    caseId: z.string().regex(/^release-(?:dev|holdout)-[a-z0-9-]+$/u),
    split: splitSchema,
    language: languageSchema,
    role: catalogRoleSchema,
    query: z.string().min(2).max(160),
  }).strict()).length(30),
}).strict().superRefine((value, context) => {
  const ids = new Set(value.cases.map(({ caseId }) => caseId));
  if (ids.size !== value.cases.length) {
    context.addIssue({ code: "custom", path: ["cases"], message: "Review case IDs must be unique" });
  }
  const developmentCount = value.cases.filter(({ split }) => split === "development").length;
  const holdoutCount = value.cases.filter(({ split }) => split === "holdout").length;
  if (developmentCount !== 20 || holdoutCount !== 10) {
    context.addIssue({ code: "custom", path: ["cases"], message: "Expected 20 development and 10 holdout cases" });
  }
  for (const split of splitSchema.options) {
    for (const role of catalogRoleSchema.options) {
      if (!value.cases.some((entry) => entry.split === split && entry.role === role)) {
        context.addIssue({ code: "custom", path: ["cases"], message: `${split} is missing role ${role}` });
      }
    }
  }
});

const reviewCandidateSchema = z.object({
  candidateKey: z.string().min(1).max(260),
  componentId: z.string().min(1).max(160),
  rebrickablePartNum: z.string().min(1).max(80),
  originalName: z.string().min(1).max(320),
  categoryRole: catalogRoleSchema,
  colorNames: z.array(z.string().min(1).max(120)),
  thumbnailUrl: z.string().startsWith("/assets/thumbnails/"),
  relevance: z.enum(["0", "1", "2"]).nullable(),
}).strict();

export const semanticSearchReleaseReviewSchema = z.object({
  schemaVersion: z.literal(1),
  updatedAt: z.iso.datetime(),
  sourcePolicy,
  reviewStatus: z.literal("pending-human-review"),
  blindedSystems: z.literal(true),
  querySetSha256: sha256,
  releaseManifestSha256: sha256,
  releaseProfileId: z.literal("compact-minilm"),
  releaseDocumentCount: z.literal(2726),
  instructions: z.string().min(1).max(1_000),
  cases: z.array(z.object({
    caseId: z.string().min(1).max(160),
    split: splitSchema,
    language: languageSchema,
    role: catalogRoleSchema,
    query: z.string().min(2).max(160),
    systems: z.object({
      baseline: z.array(z.string().min(1).max(160)).max(5),
      hybrid: z.array(z.string().min(1).max(160)).max(5),
    }).strict(),
    candidates: z.array(reviewCandidateSchema).min(1).max(10),
  }).strict()).length(30),
}).strict();

export type SemanticSearchReviewQuerySet = z.infer<typeof semanticSearchReviewQuerySetSchema>;
export type SemanticSearchReleaseReview = z.infer<typeof semanticSearchReleaseReviewSchema>;

