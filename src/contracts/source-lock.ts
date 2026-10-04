import { z } from "zod";

const catalogFileNameSchema = z.enum([
  "colors.csv.gz",
  "part_categories.csv.gz",
  "parts.csv.gz",
  "part_relationships.csv.gz",
  "elements.csv.gz",
  "sets.csv.gz",
  "inventories.csv.gz",
  "inventory_parts.csv.gz",
  "inventory_minifigs.csv.gz",
  "minifigs.csv.gz",
]);

const catalogArtifactSchema = z
  .object({
    fileName: catalogFileNameSchema,
    required: z.boolean(),
    downloadUrl: z.url().nullable(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u).nullable(),
    retrievedAt: z.iso.datetime().nullable(),
  })
  .strict();

const rebrickableCatalogSourceSchema = z
  .object({
    id: z.literal("rebrickable-catalog-downloads"),
    kind: z.literal("rebrickable-catalog-csv"),
    landingPageUrl: z.literal("https://rebrickable.com/downloads/"),
    apiUsed: z.literal(false),
    commercialUseStatus: z.literal("confirmed-by-project-owner-evidence-pending"),
    artifacts: z.array(catalogArtifactSchema).min(1),
  })
  .strict()
  .superRefine((source, context) => {
    const names = source.artifacts.map((artifact) => artifact.fileName);
    if (new Set(names).size !== names.length) {
      context.addIssue({
        code: "custom",
        path: ["artifacts"],
        message: "Catalog artifact names must be unique",
      });
    }

    for (const requiredFile of ["colors.csv.gz", "part_categories.csv.gz", "parts.csv.gz"] as const) {
      const artifact = source.artifacts.find(({ fileName }) => fileName === requiredFile);
      if (!artifact || !artifact.required) {
        context.addIssue({
          code: "custom",
          path: ["artifacts"],
          message: `Required catalog artifact must be present and marked required: ${requiredFile}`,
        });
      }
    }

    for (const [index, artifact] of source.artifacts.entries()) {
      const searchable = `${artifact.fileName} ${artifact.downloadUrl ?? ""}`.toLowerCase();
      if (searchable.includes("moc")) {
        context.addIssue({
          code: "custom",
          path: ["artifacts", index],
          message: "MOC files and URLs are forbidden",
        });
      }
      if (artifact.downloadUrl?.includes("/api/")) {
        context.addIssue({
          code: "custom",
          path: ["artifacts", index, "downloadUrl"],
          message: "The Rebrickable API is forbidden in V1",
        });
      }
    }
  });

export const sourceLockSchema = z
  .object({
    schemaVersion: z.literal(1),
    updatedAt: z.iso.date(),
    sources: z.tuple([rebrickableCatalogSourceSchema]),
  })
  .strict();

export type SourceLock = z.infer<typeof sourceLockSchema>;
export type CatalogFileName = z.infer<typeof catalogFileNameSchema>;
