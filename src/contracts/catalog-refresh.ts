import { z } from "zod";

const stableId = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u, "IDs must be stable lowercase identifiers");

const catalogFileNameSchema = z.enum([
  "colors.csv.gz",
  "part_categories.csv.gz",
  "parts.csv.gz",
  "part_relationships.csv.gz",
  "elements.csv.gz",
]);

export const normalizedColorVariantSchema = z
  .object({
    elementId: z.string().min(1).max(64),
    colorId: z.number().int().nonnegative(),
    colorName: z.string().min(1).max(120),
    rgb: z.string().regex(/^[0-9A-F]{6}$/u),
    evidenceId: stableId,
  })
  .strict();

export const normalizedPartSchema = z
  .object({
    id: stableId,
    partNum: z.string().min(1).max(80),
    name: z.string().min(1).max(320),
    categoryId: z.number().int().positive(),
    categoryName: z.string().min(1).max(160),
    material: z.string().min(1).max(80),
    colorVariants: z.array(normalizedColorVariantSchema),
    relationshipCount: z.number().int().nonnegative(),
    evidenceIds: z.array(stableId).min(1),
  })
  .strict();

export const normalizedCatalogArtifactSchema = z
  .object({
    fileName: catalogFileNameSchema,
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    rowCount: z.number().int().nonnegative(),
    columns: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const normalizedCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    sourceLockSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    sourceLockUpdatedAt: z.iso.date(),
    artifacts: z.array(normalizedCatalogArtifactSchema).min(3),
    parts: z.array(normalizedPartSchema),
  })
  .strict();

export type NormalizedColorVariant = z.infer<typeof normalizedColorVariantSchema>;
export type NormalizedPart = z.infer<typeof normalizedPartSchema>;
export type NormalizedCatalogArtifact = z.infer<typeof normalizedCatalogArtifactSchema>;
export type NormalizedCatalog = z.infer<typeof normalizedCatalogSchema>;
