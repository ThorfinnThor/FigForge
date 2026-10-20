import { describe, expect, it } from "vitest";
import {
  builderComponentForId,
  curatedCatalogParts,
  loadCatalogCoreParts,
  loadCatalogParts,
  loadComponentsForSelections,
} from "../../src/components/catalog-workspace-data.js";
import { defaultFigureSelections } from "../../src/figure/default-figure.js";

const curatedIds = new Set(curatedCatalogParts.map(({ id }) => id));
const generated = (parts: Awaited<ReturnType<typeof loadCatalogCoreParts>>) =>
  parts.filter(({ id }) => !curatedIds.has(id));

describe("core-first catalog loading", () => {
  it("resolves the default figure from the core packages alone", async () => {
    const selections = Object.entries(defaultFigureSelections()).map(([slot, componentId]) => ({
      slot: slot as Parameters<typeof loadComponentsForSelections>[0][number]["slot"],
      componentId,
    }));
    expect(selections).toHaveLength(5);

    await loadComponentsForSelections(selections);

    for (const { componentId, slot } of selections) {
      expect(builderComponentForId(componentId)?.role, componentId).toBe(slot);
    }
  });

  it("lists the head of the full builder order, so the full load only appends", async () => {
    const core = generated(await loadCatalogCoreParts("head"));
    const full = generated(await loadCatalogParts("head"));

    expect(core.length).toBeGreaterThan(100);
    expect(full.length).toBeGreaterThan(core.length * 5);
    expect(full.slice(0, core.length).map(({ id }) => id)).toEqual(core.map(({ id }) => id));
  });
});
