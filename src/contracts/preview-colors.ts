import { z } from "zod";

export const PREVIEW_COLORS_SOURCE_POLICY =
  "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;

const hexColor = z.string().regex(/^#[0-9A-F]{6}$/u, "Colours are upper-case #RRGGBB");

/**
 * Rebrickable colours whose name equals exactly one colour of the locked official LDraw
 * colour table. Everything else is left out on purpose; the preview then keeps the model colour.
 */
export const previewColorsSchema = z.object({
  schemaVersion: z.literal(1),
  sourcePolicy: z.literal(PREVIEW_COLORS_SOURCE_POLICY),
  ldrawRelease: z.string().min(1).max(20),
  colors: z.array(z.object({
    rebrickableColorId: z.number().int().nonnegative(),
    colorName: z.string().min(1).max(120),
    ldrawCode: z.number().int().nonnegative(),
    hex: hexColor,
    /** 1 is opaque; LDraw ALPHA 128 becomes about 0.5. */
    alpha: z.number().min(0.05).max(1),
  }).strict()),
  /** Colours that exist in the shop export but have no unambiguous, plain LDraw match. */
  unmapped: z.array(z.object({
    rebrickableColorId: z.number().int().nonnegative(),
    colorName: z.string().min(1).max(120),
    reason: z.enum(["no-ldraw-name-match", "ambiguous-ldraw-name", "ldraw-material-effect"]),
  }).strict()),
}).strict().superRefine((value, context) => {
  const ids = [...value.colors, ...value.unmapped].map(({ rebrickableColorId }) => rebrickableColorId);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", path: ["colors"], message: "Each colour is mapped or unmapped, never both" });
  }
});

export type PreviewColors = z.infer<typeof previewColorsSchema>;
