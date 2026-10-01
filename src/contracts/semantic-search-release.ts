import { z } from "zod";

const sha256 = z.string().regex(/^[a-f0-9]{64}$/u);

export const semanticSearchAssetSchema = z.object({
  url: z.string().startsWith("/search/"),
  byteLength: z.number().int().positive(),
  sha256,
  kind: z.enum(["model", "tokenizer", "runtime", "index", "mapping"]),
}).strict();

export const semanticSearchReleaseSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.literal("beta-pending-human-relevance-review"),
  sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
  profileId: z.literal("compact-minilm"),
  modelId: z.literal("Xenova/all-MiniLM-L6-v2"),
  modelRevision: z.string().regex(/^[a-f0-9]{40}$/u),
  runtimeVersion: z.literal("@huggingface/transformers@4.3.0"),
  queryNormalizerVersion: z.literal("de-en-domain-v1"),
  embeddingDimension: z.literal(384),
  documentCount: z.number().int().positive(),
  documentsSha256: sha256,
  orderedComponentIdsSha256: sha256,
  indexSha256: sha256,
  requiredDownloadBytes: z.number().int().positive(),
  assets: z.array(semanticSearchAssetSchema).min(8),
}).strict();

export type SemanticSearchRelease = z.infer<typeof semanticSearchReleaseSchema>;
