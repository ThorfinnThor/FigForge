import { describe, expect, it } from "vitest";
import { inventoryCoverage, parsePartInventoryCsv, subtractPartInventory } from "../../src/procurement/part-inventory.js";
import type { ShopExportResult } from "../../src/procurement/shop-export.js";

const result: ShopExportResult = {
  target: "rebrickable",
  status: "complete",
  blockers: [],
  lines: [{
    rebrickablePartNum: "3626cpr0001",
    rebrickableColorId: 14,
    colorName: "Yellow",
    elementId: null,
    bricklinkItemId: null,
    bricklinkColorId: null,
    quantity: 3,
    names: ["Head", "Head", "Head"],
    slots: ["head", "head", "head"],
  }],
};

describe("local Rebrickable inventory", () => {
  it("accepts FigForge and Rebrickable API-style headers and aggregates duplicates", () => {
    const figForge = parsePartInventoryCsv("Part,Color,Quantity\n3626cpr0001,14,1\n3626cpr0001,14,2\n", "parts.csv", "2026-10-13T10:00:00.000Z");
    const rebrickable = parsePartInventoryCsv("part_id,rb_color_id,qty\n3626cpr0001,14,2\n", "parts.csv", "2026-10-13T10:00:00.000Z");
    expect(figForge.entries[0]?.quantity).toBe(3);
    expect(rebrickable.entries[0]?.quantity).toBe(2);
  });

  it("subtracts owned quantities without changing the original export", () => {
    const inventory = parsePartInventoryCsv("Part,Color,Quantity\n3626cpr0001,14,2\n", "parts.csv", "2026-10-13T10:00:00.000Z");
    expect(subtractPartInventory(result, inventory).lines[0]?.quantity).toBe(1);
    expect(result.lines[0]?.quantity).toBe(3);
    expect(inventoryCoverage(result, inventory)).toEqual({ owned: 2, missing: 1, required: 3 });
  });

  it("rejects color names instead of guessing color IDs", () => {
    expect(() => parsePartInventoryCsv("Part,Color,Quantity\n3626cpr0001,Yellow,1\n", "parts.csv"))
      .toThrow("Color in row 2 must be a non-negative integer");
  });
});
