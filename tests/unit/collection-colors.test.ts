import { beforeAll, describe, expect, it } from "vitest";
import { previewColorForRebrickableColor } from "../../src/catalog/preview-colors.js";
import { loadCatalogParts } from "../../src/components/catalog-workspace-data.js";
import { ldrawSelectionsForFigureDocument } from "../../src/collection/collection-figures.js";
import { createFigureDocument } from "../../src/figure/figure-document.js";

describe("saved figures in the collection scene", () => {
  beforeAll(async () => {
    await loadCatalogParts("all");
  }, 120_000);

  const document = (colors: Record<string, number | undefined>) => createFigureDocument(
    {
      head: "catalog:head:3626bpr0027",
      headwear: "catalog:headwear:2528pr0002",
    },
    "Farbtest",
    undefined,
    colors,
  );

  it("carries the chosen colour of every part into the scene selection", () => {
    const selections = ldrawSelectionsForFigureDocument(document({ head: 14, headwear: 0 }));
    const byRole = new Map(selections.map((selection) => [selection.role, selection]));

    expect(previewColorForRebrickableColor(14)).toBeDefined();
    expect(byRole.get("head")?.previewColor).toEqual(previewColorForRebrickableColor(14));
    expect(byRole.get("headwear")?.previewColor).toEqual(previewColorForRebrickableColor(0));
  });

  it("keeps the model colour for a part without a chosen colour, as the builder does", () => {
    const selections = ldrawSelectionsForFigureDocument(document({ head: 14 }));
    expect(selections.find(({ role }) => role === "headwear")?.previewColor).toBeUndefined();
  });
});
