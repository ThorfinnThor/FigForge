import { z } from "zod";

const setArtifactFileNameSchema = z.enum([
  "sets.csv.gz",
  "inventories.csv.gz",
  "inventory_parts.csv.gz",
  "inventory_minifigs.csv.gz",
  "minifigs.csv.gz",
]);

const setArtifactSchema = z
  .object({
    fileName: setArtifactFileNameSchema,
    required: z.literal(true),
    downloadUrl: z.url(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    retrievedAt: z.iso.datetime(),
  })
  .strict();

export const catalogSetSourceLockSchema = z
  .object({
    schemaVersion: z.literal(1),
    updatedAt: z.iso.date(),
    sources: z.tuple([
      z
        .object({
          id: z.literal("rebrickable-catalog-set-associations"),
          kind: z.literal("rebrickable-catalog-csv"),
          landingPageUrl: z.literal("https://rebrickable.com/downloads/"),
          apiUsed: z.literal(false),
          commercialUseStatus: z.literal("confirmed-by-project-owner-evidence-pending"),
          artifacts: z.array(setArtifactSchema).length(5),
        })
        .strict(),
    ]),
  })
  .strict()
  .superRefine((lock, context) => {
    const artifacts = lock.sources[0].artifacts;
    const names = artifacts.map(({ fileName }) => fileName);
    if (new Set(names).size !== names.length) {
      context.addIssue({ code: "custom", path: ["sources", 0, "artifacts"], message: "Set artifact names must be unique" });
    }
    for (const expected of setArtifactFileNameSchema.options) {
      if (!names.includes(expected)) {
        context.addIssue({
          code: "custom",
          path: ["sources", 0, "artifacts"],
          message: `Required set artifact is missing: ${expected}`,
        });
      }
    }
    for (const [index, artifact] of artifacts.entries()) {
      const url = new URL(artifact.downloadUrl);
      if (
        url.protocol !== "https:"
        || url.hostname !== "cdn.rebrickable.com"
        || url.pathname !== `/media/downloads/${artifact.fileName}`
        || url.search
        || url.hash
      ) {
        context.addIssue({
          code: "custom",
          path: ["sources", 0, "artifacts", index, "downloadUrl"],
          message: "Set catalog URLs must use the allowlisted Rebrickable CDN path",
        });
      }
      if (/moc|\/api\//iu.test(`${artifact.fileName} ${artifact.downloadUrl}`)) {
        context.addIssue({
          code: "custom",
          path: ["sources", 0, "artifacts", index],
          message: "MOC files and API URLs are forbidden",
        });
      }
    }
  });

export type CatalogSetSourceLock = z.infer<typeof catalogSetSourceLockSchema>;
