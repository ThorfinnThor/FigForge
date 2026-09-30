import { z } from "zod";
import { catalogRoleSchema } from "./catalog-package.js";

const componentIdSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^catalog:(?:head|headwear|torsoAssembly|legsAssembly|handAccessory):[a-z0-9._:-]+$/u);

export const ldrawRuntimeEntrySchema = z.object({
  componentId: componentIdSchema,
  rebrickablePartNum: z.string().min(1).max(80),
  status: z.literal("verified"),
  ldrawFile: z.string().min(1).max(240),
  ldrawUpdate: z.string().min(1).max(80),
  modelUrl: z.string().startsWith("/assets/"),
  thumbnailUrl: z.string().startsWith("/assets/"),
  geometryFallback: z.object({
    kind: z.enum(["unprinted-print-parent", "unprinted-assembly-code"]),
    parentPartNums: z.array(z.string().min(1).max(80)),
  }).strict().nullable(),
  placementMode: z.enum(["prototype-family-origin", "snap-connector"]),
  placementTransformLdu: z.array(z.number().finite()).length(16),
}).strict();

export const ldrawRuntimePackageSchema = z.object({
  schemaVersion: z.literal(1),
  sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
  catalogEntriesSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  role: catalogRoleSchema,
  entryCount: z.number().int().nonnegative(),
  entries: z.array(ldrawRuntimeEntrySchema),
}).strict().superRefine((value, context) => {
  if (value.entryCount !== value.entries.length) {
    context.addIssue({
      code: "custom",
      path: ["entryCount"],
      message: "Runtime package entryCount must equal entries.length",
    });
  }
  const ids = new Set<string>();
  for (const [index, entry] of value.entries.entries()) {
    if (!entry.componentId.startsWith(`catalog:${value.role}:`)) {
      context.addIssue({
        code: "custom",
        path: ["entries", index, "componentId"],
        message: "Runtime entry componentId must match the package role",
      });
    }
    if (ids.has(entry.componentId)) {
      context.addIssue({
        code: "custom",
        path: ["entries", index, "componentId"],
        message: "Runtime entry component IDs must be unique",
      });
    }
    ids.add(entry.componentId);
  }
});

export type LDrawRuntimeEntry = z.infer<typeof ldrawRuntimeEntrySchema>;
export type LDrawRuntimePackage = z.infer<typeof ldrawRuntimePackageSchema>;
