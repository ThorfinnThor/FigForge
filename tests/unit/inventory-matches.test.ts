import { describe, expect, it } from "vitest";
import { messages } from "../../src/i18n.js";
import { FIGURE_TEMPLATES } from "../../src/ideas/figure-templates.js";
import { matchTemplatesToInventory } from "../../src/ideas/inventory-matches.js";
import { partNumbers } from "../../src/ideas/part-numbers.js";
import type { PartInventory } from "../../src/contracts/part-inventory.js";

const inventoryOf = (...partNums: Array<[string, number]>): PartInventory => ({
  schemaVersion: 1,
  source: "rebrickable-csv",
  importedAt: "2026-10-23T00:00:00.000Z",
  entries: partNums.map(([rebrickablePartNum, rebrickableColorId]) => ({
    rebrickablePartNum,
    rebrickableColorId,
    quantity: 1,
  })),
});

describe("figure suggestions from an inventory", () => {
  it("returns nothing for an inventory without any template part", () => {
    expect(matchTemplatesToInventory(FIGURE_TEMPLATES, inventoryOf(["3001", 4]))).toEqual([]);
  });

  it("matches by part number in any colour and case, and lists the missing parts", () => {
    const template = FIGURE_TEMPLATES[0]!;
    const [first, second] = partNumbers(template);
    const matches = matchTemplatesToInventory(
      FIGURE_TEMPLATES,
      inventoryOf([first!.number.toUpperCase(), 0], [second!.number, 71]),
    );
    const match = matches.find((candidate) => candidate.template.id === template.id);
    expect(match?.owned.map(({ number }) => number)).toEqual([first!.number, second!.number]);
    expect(match?.missing).toHaveLength(partNumbers(template).length - 2);
  });

  it("ranks templates with more owned parts first and keeps the catalog order for ties", () => {
    const [first, second] = FIGURE_TEMPLATES;
    const secondParts = partNumbers(second!);
    const inventory = inventoryOf(
      [partNumbers(first!)[0]!.number, 1],
      ...secondParts.slice(0, 2).map((part): [string, number] => [part.number, 1]),
    );
    const matches = matchTemplatesToInventory(FIGURE_TEMPLATES, inventory);
    expect(matches[0]?.template.id).toBe(second!.id);
    expect(matches.every(({ owned }) => owned.length > 0)).toBe(true);
    const counts = matches.map(({ owned }) => owned.length);
    expect(counts).toEqual([...counts].sort((left, right) => right - left));
  });

  it("reports a complete figure without missing parts", () => {
    const template = FIGURE_TEMPLATES[1]!;
    const inventory = inventoryOf(...partNumbers(template).map((part): [string, number] => [part.number, 1]));
    const match = matchTemplatesToInventory(FIGURE_TEMPLATES, inventory)
      .find((candidate) => candidate.template.id === template.id);
    expect(match?.missing).toEqual([]);
  });

  it("explains the limits of the comparison in both languages", () => {
    for (const language of ["de", "en"] as const) {
      for (const key of [
        "inventory.suggestions.title",
        "inventory.suggestions.description",
        "inventory.suggestions.none",
        "inventory.suggestions.owned",
        "inventory.suggestions.complete",
        "inventory.suggestions.missing",
        "inventory.suggestions.open",
        "inventory.suggestions.showAll",
      ] as const) {
        expect(messages[language][key]?.length ?? 0).toBeGreaterThan(5);
      }
    }
    expect(messages.de["inventory.suggestions.description"]).toContain("Baugruppen");
    expect(messages.en["inventory.suggestions.description"]).toContain("assemblies");
  });
});
