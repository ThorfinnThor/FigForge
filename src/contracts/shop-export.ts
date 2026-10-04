import { z } from "zod";
import { catalogRoleSchema } from "./catalog-package.js";

export const SHOP_EXPORT_SOURCE_POLICY = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;

/** Rebrickable colour 9999 means "[No Color/Any Color]" and is never a purchasable colour. */
export const REBRICKABLE_NO_COLOR_ID = 9999;

const elementIdSchema = z.string().regex(/^[0-9]{1,16}$/u, "LEGO element IDs are numeric");

export const shopExportColorSchema = z.object({
  rebrickableColorId: z.number().int().nonnegative(),
  colorName: z.string().min(1).max(120),
  // Rebrickable inventory evidence can prove a part/colour without a LEGO
  // element ID. Pick a Brick still requires exactly one element ID at export.
  elementIds: z.array(elementIdSchema),
}).strict();

export const shopExportEntrySchema = z.object({
  rebrickablePartNum: z.string().min(1).max(80),
  colors: z.array(shopExportColorSchema),
}).strict().superRefine((value, context) => {
  const colorIds = value.colors.map(({ rebrickableColorId }) => rebrickableColorId);
  if (new Set(colorIds).size !== colorIds.length) {
    context.addIssue({ code: "custom", path: ["colors"], message: "Colours must be unique per part" });
  }
  if (colorIds.includes(REBRICKABLE_NO_COLOR_ID)) {
    context.addIssue({ code: "custom", path: ["colors"], message: "The no-colour placeholder is not exportable" });
  }
});

export const shopExportPackageSchema = z.object({
  schemaVersion: z.literal(1),
  sourcePolicy: z.literal(SHOP_EXPORT_SOURCE_POLICY),
  catalogSourceLockSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  role: catalogRoleSchema,
  entryCount: z.number().int().nonnegative(),
  entries: z.array(shopExportEntrySchema),
}).strict().superRefine((value, context) => {
  if (value.entryCount !== value.entries.length) {
    context.addIssue({ code: "custom", path: ["entryCount"], message: "entryCount must equal entries.length" });
  }
  const partNums = value.entries.map(({ rebrickablePartNum }) => rebrickablePartNum.toLowerCase());
  if (new Set(partNums).size !== partNums.length) {
    context.addIssue({ code: "custom", path: ["entries"], message: "Part numbers must be unique per role" });
  }
});

export type ShopExportColor = z.infer<typeof shopExportColorSchema>;
export type ShopExportEntry = z.infer<typeof shopExportEntrySchema>;
export type ShopExportPackage = z.infer<typeof shopExportPackageSchema>;
