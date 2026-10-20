import { z } from "zod";
import { catalogPackageSchema, catalogRoleSchema } from "./catalog-package.js";
import { ldrawRuntimePackageSchema } from "./ldraw-runtime-package.js";
import { shopExportPackageSchema } from "./shop-export.js";

/**
 * The small first-load slice of one role: the parts of the starter figures plus the most
 * popular builder-ready parts, with their catalog, LDraw runtime and shop-export data.
 * Each nested package is a part-number subset of the full package of the same role.
 */
export const corePackageSchema = z.object({
  schemaVersion: z.literal(1),
  sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
  role: catalogRoleSchema,
  /** How many popular, non-pinned parts were added on top of the pinned parts. */
  popularCount: z.number().int().positive(),
  catalog: catalogPackageSchema,
  runtime: ldrawRuntimePackageSchema,
  shopExport: shopExportPackageSchema,
}).strict().superRefine((value, context) => {
  for (const key of ["catalog", "runtime", "shopExport"] as const) {
    if (value[key].role !== value.role) {
      context.addIssue({ code: "custom", path: [key, "role"], message: "Core package role mismatch" });
    }
  }
  const catalogPartNums = new Set(value.catalog.parts.map(({ rebrickablePartNum }) => rebrickablePartNum.toLowerCase()));
  for (const [index, entry] of value.runtime.entries.entries()) {
    if (!catalogPartNums.has(entry.rebrickablePartNum.toLowerCase())) {
      context.addIssue({
        code: "custom",
        path: ["runtime", "entries", index],
        message: "Core runtime entry has no catalog part",
      });
    }
  }
  for (const [index, entry] of value.shopExport.entries.entries()) {
    if (!catalogPartNums.has(entry.rebrickablePartNum.toLowerCase())) {
      context.addIssue({
        code: "custom",
        path: ["shopExport", "entries", index],
        message: "Core shop-export entry has no catalog part",
      });
    }
  }
});

export type CorePackage = z.infer<typeof corePackageSchema>;
