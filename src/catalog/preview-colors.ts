import previewColorsJson from "../../data/generated/preview-colors.json" with { type: "json" };
import { previewColorsSchema } from "../contracts/preview-colors.js";
import type { PreviewColor } from "../scene/preview-color.js";

const previewColors = previewColorsSchema.parse(previewColorsJson);
const byRebrickableColorId = new Map(previewColors.colors.map((color) => [
  color.rebrickableColorId,
  { hex: color.hex, alpha: color.alpha } satisfies PreviewColor,
]));

/** The colour the 3D preview can show for a purchasable Rebrickable colour, if one is documented. */
export const previewColorForRebrickableColor = (rebrickableColorId: number | undefined): PreviewColor | undefined =>
  rebrickableColorId === undefined ? undefined : byRebrickableColorId.get(rebrickableColorId);
