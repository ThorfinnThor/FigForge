import { describe, expect, it } from "vitest";
import { buildPreviewColors, normalizeColorName, parseLDrawColors } from "../../tools/lib/preview-colors.js";
import { previewColorForRebrickableColor } from "../../src/catalog/preview-colors.js";

describe("preview colour mapping", () => {
  it("normalises the spelling differences between Rebrickable and LDraw names", () => {
    expect(normalizeColorName("Reddish_Brown")).toBe(normalizeColorName("Reddish Brown"));
    expect(normalizeColorName("Trans_Clear")).toBe(normalizeColorName("Trans-Clear"));
    expect(normalizeColorName("Light_Bluish_Grey")).toBe(normalizeColorName("Light Bluish Gray"));
    expect(normalizeColorName("Dark Purple")).not.toBe(normalizeColorName("Purple"));
  });

  it("reads code, value, alpha and material effects from the LDraw colour table", () => {
    const colors = parseLDrawColors([
      "0 !COLOUR Black CODE 0 VALUE #1B2A34 EDGE #28403D",
      "0 !COLOUR Trans_Clear CODE 47 VALUE #FCFCFC EDGE #C9C9C9 ALPHA 128",
      "0 !COLOUR Glitter_Trans_Purple CODE 114 VALUE #DF6695 EDGE #AA4D8E ALPHA 128 LUMINANCE 15 MATERIAL GLITTER VALUE #923978 FRACTION 0.17",
      "0 // not a colour",
    ].join("\n"));

    expect(colors.map(({ name, code, hex }) => [name, code, hex])).toEqual([
      ["Black", 0, "#1B2A34"],
      ["Trans_Clear", 47, "#FCFCFC"],
      ["Glitter_Trans_Purple", 114, "#DF6695"],
    ]);
    expect(colors[1]?.alpha).toBeCloseTo(0.502, 3);
    expect(colors.map(({ hasMaterialEffect }) => hasMaterialEffect)).toEqual([false, false, true]);
  });

  it("maps only unambiguous plain colours and says why the rest is left out", async () => {
    const result = await buildPreviewColors(process.cwd());
    const unmappedIds = new Set(result.unmapped.map(({ rebrickableColorId }) => rebrickableColorId));

    expect(result.colors.length).toBeGreaterThan(100);
    expect(result.colors.find(({ colorName }) => colorName === "Black")?.hex).toBe("#1B2A34");
    expect(result.colors.every(({ rebrickableColorId }) => !unmappedIds.has(rebrickableColorId))).toBe(true);
    expect(result.unmapped.find(({ colorName }) => colorName === "Dark Purple")?.reason).toBe("no-ldraw-name-match");
    expect(result.unmapped.find(({ colorName }) => colorName.startsWith("Glitter"))?.reason).toBe("ldraw-material-effect");
  });

  it("answers by Rebrickable colour id and stays empty for unknown or unmapped colours", () => {
    expect(previewColorForRebrickableColor(0)).toEqual({ hex: "#1B2A34", alpha: 1 });
    expect(previewColorForRebrickableColor(47)?.alpha).toBeLessThan(1);
    expect(previewColorForRebrickableColor(85)).toBeUndefined();
    expect(previewColorForRebrickableColor(undefined)).toBeUndefined();
  });
});
