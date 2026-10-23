import { REBRICKABLE_NO_COLOR_ID, type ShopExportEntry } from "../contracts/shop-export.js";
import { partInventoryKey, partInventorySchema, type PartInventory } from "../contracts/part-inventory.js";

export type BrickLinkInventoryItem = { itemId: string; colorId: number | null; quantity: number };

export type BrickLinkInventoryParse = {
  items: BrickLinkInventoryItem[];
  /** Items of another type than "part", for example minifigures or sets. */
  skippedNonPart: number;
  /** Part items without a usable item ID or quantity. */
  skippedInvalid: number;
};

export type BrickLinkImportSummary = {
  /** Distinct list positions that were mapped to a catalog part. */
  matched: number;
  /** Matched positions whose BrickLink colour has no exact Rebrickable colour; stored as "any colour". */
  colorUnmatched: number;
  /** Positions that are not a minifigure part of this catalog or have no BrickLink ID there. */
  notInCatalog: number;
  /** Positions whose BrickLink ID belongs to several catalog parts and therefore stays unmapped. */
  ambiguous: number;
};

export type BrickLinkImportResult = { inventory: PartInventory; summary: BrickLinkImportSummary };

const MAX_ITEMS = 200_000;

const tagValue = (block: string, tag: string): string | null => {
  const match = new RegExp(`<${tag}>([^<]*)</${tag}>`, "iu").exec(block);
  return match ? match[1]!.trim() : null;
};

const wholeNumber = (value: string | null): number | null => {
  if (value === null || !/^\d{1,9}$/u.test(value)) return null;
  return Number(value);
};

/**
 * Reads a BrickLink inventory or wanted-list XML. A part's quantity is QTY, otherwise MINQTY, so
 * every quantity listed counts as owned. Only part items (ITEMTYPE P) are read.
 */
export const parseBrickLinkInventoryXml = (input: string): BrickLinkInventoryParse => {
  if (!/<INVENTORY[\s>]/iu.test(input)) throw new Error("Not a BrickLink inventory XML");
  const items: BrickLinkInventoryItem[] = [];
  let skippedNonPart = 0;
  let skippedInvalid = 0;
  for (const match of input.matchAll(/<ITEM>([\s\S]*?)<\/ITEM>/giu)) {
    if (items.length + skippedNonPart + skippedInvalid >= MAX_ITEMS) throw new Error("BrickLink inventory is too large");
    const block = match[1]!;
    if ((tagValue(block, "ITEMTYPE") ?? "P").toUpperCase() !== "P") {
      skippedNonPart += 1;
      continue;
    }
    const itemId = tagValue(block, "ITEMID");
    const quantity = wholeNumber(tagValue(block, "QTY")) ?? wholeNumber(tagValue(block, "MINQTY"));
    if (!itemId || quantity === null || quantity <= 0) {
      skippedInvalid += 1;
      continue;
    }
    items.push({ itemId, colorId: wholeNumber(tagValue(block, "COLOR")), quantity });
  }
  return { items, skippedNonPart, skippedInvalid };
};

/**
 * Maps BrickLink part IDs to Rebrickable part numbers through the catalog's shop export data.
 * Only exact, unique BrickLink IDs are used; colours are mapped through the part's own colour list.
 */
export const importBrickLinkInventory = (
  items: readonly BrickLinkInventoryItem[],
  entries: readonly ShopExportEntry[],
  importedAt = new Date().toISOString(),
): BrickLinkImportResult => {
  const entriesByItemId = new Map<string, ShopExportEntry[]>();
  for (const entry of entries) {
    if (!entry.bricklinkItemId) continue;
    const key = entry.bricklinkItemId.toLowerCase();
    entriesByItemId.set(key, [...(entriesByItemId.get(key) ?? []), entry]);
  }

  const summary: BrickLinkImportSummary = { matched: 0, colorUnmatched: 0, notInCatalog: 0, ambiguous: 0 };
  const owned = new Map<string, { rebrickablePartNum: string; rebrickableColorId: number; quantity: number }>();
  for (const item of items) {
    const candidates = entriesByItemId.get(item.itemId.toLowerCase()) ?? [];
    if (candidates.length === 0) {
      summary.notInCatalog += 1;
      continue;
    }
    if (candidates.length > 1) {
      summary.ambiguous += 1;
      continue;
    }
    const entry = candidates[0]!;
    const colors = entry.colors.filter(({ bricklinkColorId }) => bricklinkColorId === item.colorId);
    const rebrickableColorId = item.colorId !== null && colors.length === 1
      ? colors[0]!.rebrickableColorId
      : REBRICKABLE_NO_COLOR_ID;
    if (rebrickableColorId === REBRICKABLE_NO_COLOR_ID) summary.colorUnmatched += 1;
    summary.matched += 1;
    const key = partInventoryKey(entry.rebrickablePartNum, rebrickableColorId);
    const previous = owned.get(key);
    owned.set(key, {
      rebrickablePartNum: entry.rebrickablePartNum,
      rebrickableColorId,
      quantity: (previous?.quantity ?? 0) + item.quantity,
    });
  }

  return {
    inventory: partInventorySchema.parse({
      schemaVersion: 1,
      source: "bricklink-xml",
      importedAt,
      entries: [...owned.values()],
    }),
    summary,
  };
};
