import { describe, expect, it } from "vitest";
import headExport from "../../data/generated/shop-export/head.json" with { type: "json" };
import headwearExport from "../../data/generated/shop-export/headwear.json" with { type: "json" };
import { messages } from "../../src/i18n.js";
import { FIGURE_TEMPLATES } from "../../src/ideas/figure-templates.js";
import { matchTemplatesToInventory } from "../../src/ideas/inventory-matches.js";
import { shopExportPackageSchema, type ShopExportEntry } from "../../src/contracts/shop-export.js";
import {
  importBrickLinkInventory,
  parseBrickLinkInventoryXml,
} from "../../src/procurement/bricklink-inventory.js";

const entry = (partNum: string, bricklinkItemId: string | null, colors: Array<[number, number | null]>): ShopExportEntry => ({
  rebrickablePartNum: partNum,
  bricklinkItemId,
  colors: colors.map(([rebrickableColorId, bricklinkColorId]) => ({
    rebrickableColorId,
    colorName: `Colour ${rebrickableColorId}`,
    elementIds: [],
    bricklinkColorId,
  })),
});

const xml = (...items: string[]): string => `<INVENTORY>${items.map((item) => `<ITEM>${item}</ITEM>`).join("")}</INVENTORY>`;
const part = (id: string, color: number | string, quantity: string): string =>
  `<ITEMTYPE>P</ITEMTYPE><ITEMID>${id}</ITEMID><COLOR>${color}</COLOR>${quantity}`;

describe("BrickLink inventory import", () => {
  it("reads QTY from an inventory and MINQTY from a wanted list, and skips other item types", () => {
    const parsed = parseBrickLinkInventoryXml(xml(
      part("3626pb0082", 3, "<QTY>2</QTY>"),
      part("2528pb04", 11, "<MINQTY>3</MINQTY><MAXPRICE>-1.0000</MAXPRICE>"),
      "<ITEMTYPE>M</ITEMTYPE><ITEMID>sw0001</ITEMID><COLOR>0</COLOR><QTY>1</QTY>",
      part("3001", 5, "<QTY>0</QTY>"),
      "<ITEMTYPE>P</ITEMTYPE><COLOR>5</COLOR><QTY>1</QTY>",
    ));
    expect(parsed.items).toEqual([
      { itemId: "3626pb0082", colorId: 3, quantity: 2 },
      { itemId: "2528pb04", colorId: 11, quantity: 3 },
    ]);
    expect(parsed.skippedNonPart).toBe(1);
    expect(parsed.skippedInvalid).toBe(2);
  });

  it("rejects files that are not a BrickLink inventory", () => {
    expect(() => parseBrickLinkInventoryXml("Part,Color,Quantity\n3001,5,1")).toThrow(/BrickLink/u);
    expect(() => parseBrickLinkInventoryXml("<html></html>")).toThrow(/BrickLink/u);
  });

  it("maps unique IDs and colours, and keeps unmatched colours as any colour", () => {
    const entries = [
      entry("3626bpr0027", "3626pb0082", [[14, 3]]),
      entry("2528pr0002", "2528pb04", [[0, 11], [8, 10]]),
    ];
    const { inventory, summary } = importBrickLinkInventory([
      { itemId: "3626PB0082", colorId: 3, quantity: 1 },
      { itemId: "3626pb0082", colorId: 3, quantity: 2 },
      { itemId: "2528pb04", colorId: 99, quantity: 1 },
    ], entries, "2026-10-23T00:00:00.000Z");
    expect(inventory.source).toBe("bricklink-xml");
    expect(inventory.entries).toEqual([
      { rebrickablePartNum: "3626bpr0027", rebrickableColorId: 14, quantity: 3 },
      { rebrickablePartNum: "2528pr0002", rebrickableColorId: 9999, quantity: 1 },
    ]);
    expect(summary).toEqual({ matched: 3, colorUnmatched: 1, notInCatalog: 0, ambiguous: 0 });
  });

  it("leaves ambiguous and unknown IDs unmapped instead of guessing", () => {
    const entries = [
      entry("973c03h03", "973c000", [[0, 11]]),
      entry("973c04h04", "973c000", [[0, 11]]),
      entry("2530", null, [[0, 11]]),
    ];
    const { inventory, summary } = importBrickLinkInventory([
      { itemId: "973c000", colorId: 11, quantity: 1 },
      { itemId: "3001", colorId: 5, quantity: 4 },
    ], entries);
    expect(inventory.entries).toEqual([]);
    expect(summary).toEqual({ matched: 0, colorUnmatched: 0, notInCatalog: 1, ambiguous: 1 });
  });

  it("matches real catalog parts and feeds the figure suggestions", () => {
    const entries = [headExport, headwearExport].flatMap((data) => shopExportPackageSchema.parse(data).entries);
    const parsed = parseBrickLinkInventoryXml(xml(
      part("3626pb0082", 3, "<QTY>1</QTY>"),
      part("2528pb04", 11, "<QTY>1</QTY>"),
    ));
    const { inventory, summary } = importBrickLinkInventory(parsed.items, entries);
    expect(summary.matched).toBe(2);
    expect(inventory.entries.map(({ rebrickablePartNum }) => rebrickablePartNum).sort())
      .toEqual(["2528pr0002", "3626bpr0027"]);
    const captain = matchTemplatesToInventory(FIGURE_TEMPLATES, inventory)
      .find(({ template }) => template.id === "pirate-captain");
    expect(captain?.owned.map(({ slot }) => slot)).toEqual(["head", "headwear"]);
  });

  it("explains the import in both languages", () => {
    for (const language of ["de", "en"] as const) {
      for (const key of [
        "inventory.bricklink.import",
        "inventory.bricklink.hint",
        "inventory.bricklink.success",
        "inventory.bricklink.empty",
        "inventory.bricklink.error",
      ] as const) {
        expect(messages[language][key]?.length ?? 0).toBeGreaterThan(8);
      }
    }
  });
});
