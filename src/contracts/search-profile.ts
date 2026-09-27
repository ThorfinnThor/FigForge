import { z } from "zod";

const sha256 = z.string().regex(/^[a-f0-9]{64}$/u);
const stableId = z.string().min(1).max(160).regex(/^[a-z0-9][a-z0-9._:-]*$/u);

const modelFileSchema = z
  .object({
    path: z.string().min(1).max(240),
    byteLength: z.number().int().positive(),
    sha256,
    url: z.url(),
  })
  .strict();

export const searchModelLockSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-18"),
    updatedAt: z.iso.datetime(),
    runtimePackage: z.literal("@huggingface/transformers"),
    runtimeVersion: z.literal("4.3.0"),
    profiles: z
      .array(
        z
          .object({
            profileId: z.enum(["compact-minilm", "quality-e5"]),
            upstreamModelId: z.string().min(1).max(160),
            exportRepository: z.string().min(1).max(160),
            modelRevision: z.string().regex(/^[a-f0-9]{40}$/u),
            licenseId: z.string().min(1).max(80),
            files: z.array(modelFileSchema).min(5),
          })
          .strict(),
      )
      .length(2),
  })
  .strict();

export const searchProfileSchema = z
  .object({
    profileId: z.enum(["compact-minilm", "quality-e5"]),
    schemaVersion: z.literal(1),
    catalogVersion: sha256,
    upstreamModelId: z.string().min(1).max(160),
    exportRepository: z.string().min(1).max(160),
    modelRevision: z.string().regex(/^[a-f0-9]{40}$/u),
    onnxSha256: sha256,
    runtimeVersion: z.literal("@huggingface/transformers@4.3.0"),
    tokenizerRevision: z.string().regex(/^[a-f0-9]{40}$/u),
    tokenizerSha256: sha256,
    quantization: z.literal("int8"),
    embeddingDimension: z.literal(384),
    pooling: z.literal("mean-with-attention-mask"),
    normalize: z.literal(true),
    maxTokens: z.number().int().positive().max(512),
    queryPrefix: z.string().max(32),
    documentPrefix: z.string().max(32),
    queryNormalizerVersion: z.enum(["de-en-domain-v1", "direct-multilingual-v1"]),
    documentSchemaVersion: z.literal("catalog-name-category-color-v1"),
    indexDtype: z.literal("float32-le"),
    indexSha256: sha256,
    orderedVariantIdsSha256: sha256,
    documentCount: z.number().int().positive(),
    indexByteLength: z.number().int().positive(),
    requiredFiles: z.array(modelFileSchema).min(5),
  })
  .strict();

export const searchIndexManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-18"),
    updatedAt: z.iso.datetime(),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    profiles: z
      .array(
        z
          .object({
            profileId: z.enum(["compact-minilm", "quality-e5"]),
            profilePath: z.string().min(1).max(240),
            indexPath: z.string().min(1).max(240),
            profileSha256: sha256,
            indexSha256: sha256,
          })
          .strict(),
      )
      .length(2),
    decisionStatus: z.literal("blocked-pending-human-relevance-review"),
  })
  .strict();

export const relevanceReviewCandidateSchema = z
  .object({
    candidateKey: stableId,
    componentId: stableId,
    rebrickablePartNum: z.string().min(1).max(80),
    originalName: z.string().min(1).max(320),
    categoryRole: z.enum(["head", "headwear", "torsoAssembly", "legsAssembly", "handAccessory"]),
    colorName: z.string().min(1).max(80),
    relevance: z.enum(["0", "1", "2"]).nullable(),
  })
  .strict();

export const relevanceReviewSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-18"),
    updatedAt: z.iso.datetime(),
    instructions: z.string().min(1).max(1_000),
    blindedSystems: z.literal(true),
    reviewStatus: z.literal("pending-human-review"),
    cases: z.array(z.object({ caseId: stableId, split: z.enum(["development", "holdout"]), query: z.string().min(1).max(240), candidates: z.array(relevanceReviewCandidateSchema).min(1) }).strict()).length(160),
  })
  .strict();

export type SearchModelLock = z.infer<typeof searchModelLockSchema>;
export type SearchProfile = z.infer<typeof searchProfileSchema>;
export type SearchIndexManifest = z.infer<typeof searchIndexManifestSchema>;
export type RelevanceReview = z.infer<typeof relevanceReviewSchema>;
