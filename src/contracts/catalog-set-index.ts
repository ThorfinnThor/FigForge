import { z } from "zod";

export const CATALOG_SET_INDEX_SOURCE_POLICY =
  "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;

const indexedSetSchema = z
  .object({
    setNum: z.string().min(1).max(80),
    name: z.string().min(1).max(320),
    year: z.number().int().min(1949).max(3000),
    partIndexes: z.array(z.number().int().nonnegative()).min(1),
  })
  .strict();

export const catalogSetIndexSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourcePolicy: z.literal(CATALOG_SET_INDEX_SOURCE_POLICY),
    sourceLockSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    parts: z.array(z.string().min(1).max(80)),
    sets: z.array(indexedSetSchema),
    summary: z
      .object({
        relevantPartCount: z.number().int().nonnegative(),
        mappedPartCount: z.number().int().nonnegative(),
        unmappedPartCount: z.number().int().nonnegative(),
        setCount: z.number().int().nonnegative(),
        associationCount: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict()
  .superRefine((index, context) => {
    if (new Set(index.parts).size !== index.parts.length) {
      context.addIssue({ code: "custom", path: ["parts"], message: "Part numbers must be unique" });
    }
    if (new Set(index.sets.map(({ setNum }) => setNum)).size !== index.sets.length) {
      context.addIssue({ code: "custom", path: ["sets"], message: "Set numbers must be unique" });
    }

    const mappedPartIndexes = new Set<number>();
    let associationCount = 0;
    for (const [setIndex, set] of index.sets.entries()) {
      const uniqueIndexes = new Set(set.partIndexes);
      if (uniqueIndexes.size !== set.partIndexes.length) {
        context.addIssue({
          code: "custom",
          path: ["sets", setIndex, "partIndexes"],
          message: "Part indexes must be unique per set",
        });
      }
      for (const partIndex of uniqueIndexes) {
        if (partIndex >= index.parts.length) {
          context.addIssue({
            code: "custom",
            path: ["sets", setIndex, "partIndexes"],
            message: `Part index is outside the parts table: ${partIndex}`,
          });
        } else {
          mappedPartIndexes.add(partIndex);
        }
      }
      associationCount += uniqueIndexes.size;
    }

    const expected = {
      relevantPartCount: index.parts.length,
      mappedPartCount: mappedPartIndexes.size,
      unmappedPartCount: index.parts.length - mappedPartIndexes.size,
      setCount: index.sets.length,
      associationCount,
    };
    for (const [field, value] of Object.entries(expected) as Array<[keyof typeof expected, number]>) {
      if (index.summary[field] !== value) {
        context.addIssue({
          code: "custom",
          path: ["summary", field],
          message: `Expected ${String(field)} to be ${value}`,
        });
      }
    }
  });

export type CatalogSetIndex = z.infer<typeof catalogSetIndexSchema>;
