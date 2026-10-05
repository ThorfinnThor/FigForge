import type { CatalogRole } from "../contracts/catalog-package.js";

const roleText: Record<CatalogRole, string> = {
  head: "minifigure head",
  headwear: "minifigure hair helmet or headwear",
  torsoAssembly: "minifigure torso body",
  legsAssembly: "minifigure hips and legs",
  handAccessory: "minifigure hand accessory",
};

export type CatalogSearchDocumentInput = {
  name: string;
  rebrickableCategoryName: string;
  rebrickablePartNum: string;
  role: CatalogRole;
  colorNames?: readonly string[];
};

export function buildCatalogSearchText(
  part: CatalogSearchDocumentInput,
  ldrawDescription = "",
): string {
  const colors = [...new Set(part.colorNames ?? [])]
    .sort((left, right) => left.localeCompare(right, "en"));
  return [
    part.name,
    ldrawDescription ? `Official LDraw description: ${ldrawDescription}.` : "",
    `Category: ${part.rebrickableCategoryName}.`,
    `Type: ${roleText[part.role]}.`,
    colors.length > 0 ? `Colors: ${colors.join(", ")}.` : "",
    `Part ID: ${part.rebrickablePartNum}.`,
  ].filter(Boolean).join(" ");
}
