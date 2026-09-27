import { z } from "zod";

const stableId = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u, "IDs must be stable lowercase identifiers");
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const internalPath = z
  .string()
  .startsWith("/")
  .refine((value) => !value.startsWith("//"), "Paths must be same-origin paths");

export const sourceNoticeSchema = z
  .object({
    id: stableId,
    name: z.string().min(1).max(160),
    scope: z.enum(["catalog-metadata", "runtime", "synthetic-fixture", "ldraw-assets"]),
    url: z.url().nullable(),
    localPath: internalPath.nullable(),
    status: z.enum(["confirmed", "pending", "blocked", "not-applicable"]),
    attribution: z.string().min(1).max(500),
    note: z.string().min(1).max(800),
  })
  .strict();

export const licenseEvidenceSchema = z
  .object({
    id: stableId,
    sourceId: stableId,
    subjectId: stableId,
    status: z.enum(["confirmed", "pending", "blocked", "not-applicable"]),
    licenseId: z.string().min(1).max(160).nullable(),
    localPath: internalPath.nullable(),
    sha256: hashSchema.nullable(),
    note: z.string().min(1).max(800),
  })
  .strict();

export const assetManifestEntrySchema = z
  .object({
    id: stableId,
    kind: z.enum(["model-package", "thumbnail"]),
    path: internalPath,
    sha256: hashSchema,
    bytes: z.number().int().positive(),
    sourceIds: z.array(stableId).min(1),
    licenseEvidenceIds: z.array(stableId).min(1),
    status: z.enum(["ready", "review", "blocked"]),
    publishable: z.literal(false),
    note: z.string().min(1).max(800),
  })
  .strict();

export const assetManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-11"),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    provenance: z
      .object({
        sourceLockSha256: hashSchema,
        modelPackageIndexSha256: hashSchema,
        mappingReviewSha256: hashSchema,
      })
      .strict(),
    release: z
      .object({
        status: z.literal("blocked"),
        publishable: z.literal(false),
        reason: z.string().min(1).max(800),
      })
      .strict(),
    noticesFile: z
      .object({
        path: internalPath,
        sha256: hashSchema,
        bytes: z.number().int().positive(),
      })
      .strict(),
    assets: z.array(assetManifestEntrySchema).min(1),
    sourceNotices: z.array(sourceNoticeSchema).min(1),
    licenseEvidence: z.array(licenseEvidenceSchema).min(1),
    openBlockers: z.array(z.string().min(1).max(800)).min(1),
  })
  .strict();

export const publicNoticesSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-11"),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    sourceNotices: z.array(sourceNoticeSchema).min(1),
    licenseEvidence: z.array(licenseEvidenceSchema).min(1),
    openBlockers: z.array(z.string().min(1).max(800)).min(1),
  })
  .strict();

export type SourceNotice = z.infer<typeof sourceNoticeSchema>;
export type LicenseEvidence = z.infer<typeof licenseEvidenceSchema>;
export type AssetManifestEntry = z.infer<typeof assetManifestEntrySchema>;
export type AssetManifest = z.infer<typeof assetManifestSchema>;
export type PublicNotices = z.infer<typeof publicNoticesSchema>;
