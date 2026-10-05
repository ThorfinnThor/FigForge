import { z } from "zod";

export const catalogRoleSchema = z.enum([
  "head",
  "headwear",
  "torsoAssembly",
  "legsAssembly",
  "handAccessory",
]);

const stableId = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u, "IDs must be stable lowercase identifiers");

export const catalogPackagePartSchema = z
  .object({
    id: stableId,
    role: catalogRoleSchema,
    rebrickablePartNum: z.string().min(1).max(80),
    name: z.string().min(1).max(320),
    rebrickableCategoryId: z.number().int().positive(),
    rebrickableCategoryName: z.string().min(1).max(160),
    material: z.string().min(1).max(80),
    colorNames: z.array(z.string().min(1).max(120)),
    searchText: z.string().min(1).max(4_000).optional(),
  })
  .strict();

export const catalogPackageSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    sourceLockSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    role: catalogRoleSchema,
    categoryIds: z.array(z.number().int().positive()).min(1),
    parts: z.array(catalogPackagePartSchema),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = new Set<string>();
    for (const [index, part] of value.parts.entries()) {
      if (part.role !== value.role) {
        context.addIssue({
          code: "custom",
          path: ["parts", index, "role"],
          message: "Catalog package part role must match the package role",
        });
      }
      if (!value.categoryIds.includes(part.rebrickableCategoryId)) {
        context.addIssue({
          code: "custom",
          path: ["parts", index, "rebrickableCategoryId"],
          message: "Catalog package part category is outside the package allowlist",
        });
      }
      if (ids.has(part.id)) {
        context.addIssue({
          code: "custom",
          path: ["parts", index, "id"],
          message: "Catalog package part IDs must be unique",
        });
      }
      ids.add(part.id);
    }
  });

export const catalogPackageManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    sourceLockSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    includedPartCount: z.number().int().nonnegative(),
    packages: z.array(z.object({
      role: catalogRoleSchema,
      fileName: z.string().regex(/^[a-z-]+\.json$/u),
      categoryIds: z.array(z.number().int().positive()).min(1),
      partCount: z.number().int().nonnegative(),
    }).strict()).length(5),
  })
  .strict();

export type CatalogRole = z.infer<typeof catalogRoleSchema>;
export type CatalogPackagePart = z.infer<typeof catalogPackagePartSchema>;
export type CatalogPackage = z.infer<typeof catalogPackageSchema>;
export type CatalogPackageManifest = z.infer<typeof catalogPackageManifestSchema>;
