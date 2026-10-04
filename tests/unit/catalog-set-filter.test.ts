import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { catalogSetIndexSchema } from "../../src/contracts/catalog-set-index.js";
import {
  findCatalogSets,
  partNumbersForCatalogSet,
} from "../../src/catalog/catalog-set-filter.js";

describe("catalog set filter", () => {
  it("finds sets by exact number, partial number and normalized name", async () => {
    const index = catalogSetIndexSchema.parse(JSON.parse(
      await readFile("data/generated/catalog-set-index.json", "utf8"),
    ) as unknown);

    expect(findCatalogSets(index, "71048-1", 1)[0]).toMatchObject({
      setNum: "71048-1",
      name: "Hamster Costume Fan",
    });
    expect(findCatalogSets(index, "71048", 3)).toHaveLength(3);
    expect(findCatalogSets(index, "hamster costume", 1)[0]?.setNum).toBe("71048-1");
  });

  it("resolves only the part numbers documented for the selected set", async () => {
    const index = catalogSetIndexSchema.parse(JSON.parse(
      await readFile("data/generated/catalog-set-index.json", "utf8"),
    ) as unknown);
    const set = findCatalogSets(index, "71048-1", 1)[0];
    expect(set).toBeDefined();
    const parts = partNumbersForCatalogSet(index, set!);

    expect(parts).toHaveLength(4);
    expect(new Set(parts).size).toBe(parts.length);
    expect(parts.every((partNum) => index.parts.includes(partNum))).toBe(true);
  });

  it("offers recent sets when the editable dropdown opens without a query", async () => {
    const index = catalogSetIndexSchema.parse(JSON.parse(
      await readFile("data/generated/catalog-set-index.json", "utf8"),
    ) as unknown);
    const suggestions = findCatalogSets(index, "", 8);

    expect(suggestions).toHaveLength(8);
    expect(suggestions[0]?.year).toBe(Math.max(...index.sets.map(({ year }) => year)));
    expect(suggestions.map(({ year }) => year)).toEqual(
      [...suggestions].map(({ year }) => year).sort((left, right) => right - left),
    );
  });

  it("keeps the set picker editable and exposes a separate dropdown control", async () => {
    const source = await readFile("src/components/CatalogSetFilter.tsx", "utf8");

    expect(source).toContain('role="combobox"');
    expect(source).toContain('type="search"');
    expect(source).toContain('className="catalog-set-filter__toggle"');
    expect(source).toContain('t("catalog.setFilter.toggle")');
  });
});
