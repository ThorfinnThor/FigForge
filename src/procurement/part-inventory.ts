import { parseCsv } from "../catalog/csv.js";
import {
  partInventoryKey,
  partInventorySchema,
  type PartInventory,
  type PartInventoryEntry,
} from "../contracts/part-inventory.js";
import type { ShopExportResult } from "./shop-export.js";

const normalizedHeader = (header: string): string => header.trim().toLowerCase().replaceAll(/[\s_-]+/gu, "");

const headerFor = (headers: readonly string[], aliases: readonly string[]): string | undefined =>
  headers.find((header) => aliases.includes(normalizedHeader(header)));

const positiveInteger = (value: string, label: string, row: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} in row ${row} must be a positive integer`);
  return parsed;
};

const nonnegativeInteger = (value: string, label: string, row: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${label} in row ${row} must be a non-negative integer`);
  return parsed;
};

export const parsePartInventoryCsv = (
  input: string,
  fileName: string,
  importedAt = new Date().toISOString(),
): PartInventory => {
  const table = parseCsv(input, fileName);
  const partHeader = headerFor(table.headers, ["part", "partnum", "partid"]);
  const colorHeader = headerFor(table.headers, ["color", "colorid", "rbcolorid"]);
  const quantityHeader = headerFor(table.headers, ["quantity", "qty"]);
  if (!partHeader || !colorHeader || !quantityHeader) {
    throw new Error("CSV must contain Part/Color/Quantity or part_id/rb_color_id/qty columns");
  }

  const entries = new Map<string, PartInventoryEntry>();
  table.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const rebrickablePartNum = row[partHeader]?.trim() ?? "";
    if (!rebrickablePartNum) throw new Error(`Part in row ${rowNumber} is empty`);
    const rebrickableColorId = nonnegativeInteger(row[colorHeader] ?? "", "Color", rowNumber);
    const quantity = positiveInteger(row[quantityHeader] ?? "", "Quantity", rowNumber);
    const key = partInventoryKey(rebrickablePartNum, rebrickableColorId);
    const previous = entries.get(key);
    entries.set(key, {
      rebrickablePartNum,
      rebrickableColorId,
      quantity: (previous?.quantity ?? 0) + quantity,
    });
  });

  return partInventorySchema.parse({
    schemaVersion: 1,
    source: "rebrickable-csv",
    importedAt,
    entries: [...entries.values()],
  });
};

export const subtractPartInventory = (
  result: ShopExportResult,
  inventory: PartInventory,
): ShopExportResult => {
  const owned = new Map(inventory.entries.map((entry) => [
    partInventoryKey(entry.rebrickablePartNum, entry.rebrickableColorId),
    entry.quantity,
  ]));
  const lines = result.lines.flatMap((line) => {
    const quantity = Math.max(0, line.quantity - (owned.get(partInventoryKey(
      line.rebrickablePartNum,
      line.rebrickableColorId,
    )) ?? 0));
    return quantity > 0 ? [{ ...line, quantity }] : [];
  });
  return { ...result, lines };
};

export const inventoryCoverage = (result: ShopExportResult, inventory: PartInventory): {
  owned: number;
  missing: number;
  required: number;
} => {
  const missing = subtractPartInventory(result, inventory).lines.reduce((sum, line) => sum + line.quantity, 0);
  const required = result.lines.reduce((sum, line) => sum + line.quantity, 0);
  return { owned: required - missing, missing, required };
};
