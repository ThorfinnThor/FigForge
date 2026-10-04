import type { CatalogRole } from "../contracts/catalog-package.js";
import type { ShopExportEntry } from "../contracts/shop-export.js";

export type ShopExportTarget = "lego-pick-a-brick" | "rebrickable";

export type ShopExportSelection = {
  slot: CatalogRole;
  name: string;
  rebrickablePartNum: string;
  /** Explicit user choice in the Rebrickable colour namespace. */
  rebrickableColorId?: number;
};

export type ShopExportBlockReason =
  | "not-indexed"
  | "no-color"
  | "multiple-colors"
  | "invalid-color"
  | "no-element-id"
  | "multiple-element-ids";

export type ShopExportBlocker = ShopExportSelection & {
  reason: ShopExportBlockReason;
  message: string;
};

export type ShopExportLine = {
  rebrickablePartNum: string;
  rebrickableColorId: number;
  colorName: string;
  /** Set only for Pick a Brick lines; Rebrickable lines are keyed by part and colour. */
  elementId: string | null;
  quantity: number;
  names: string[];
  slots: CatalogRole[];
};

export type ShopExportResult = {
  target: ShopExportTarget;
  status: "empty" | "complete" | "partial" | "blocked";
  lines: ShopExportLine[];
  blockers: ShopExportBlocker[];
};

export type ShopExportCoverage = {
  selection: ShopExportSelection;
  status: "included" | "blocked";
  reason?: ShopExportBlockReason;
};

export type ShopExportLookup = (slot: CatalogRole, rebrickablePartNum: string) => ShopExportEntry | undefined;

const blockMessages: Record<ShopExportBlockReason, string> = {
  "not-indexed": "Für dieses Teil liegen noch keine Exportdaten vor.",
  "no-color": "Das Teil ist im Rebrickable-Katalog vorhanden, aber die Catalog Downloads belegen keine Farbe für den CSV-Export.",
  "multiple-colors": "Das Teil gibt es in mehreren Farben; die Vorschaufarbe ist keine bestätigte Auswahl.",
  "invalid-color": "Die gewählte Farbe ist für dieses Teil nicht im Katalog belegt.",
  "no-element-id": "Für diese Teil-Farb-Kombination ist keine LEGO-Elementnummer bekannt.",
  "multiple-element-ids": "Für diese Teil-Farb-Kombination gibt es mehrere LEGO-Elementnummern; welche Pick a Brick führt, ist offen.",
};

const block = (selection: ShopExportSelection, reason: ShopExportBlockReason): ShopExportBlocker => ({
  ...selection,
  reason,
  message: blockMessages[reason],
});

/**
 * Turns the parts of a figure into shop lines. Every selection needs exactly one catalogue colour;
 * Pick a Brick additionally needs exactly one LEGO element ID for that colour. Nothing is guessed.
 */
export const compileShopExport = (
  target: ShopExportTarget,
  selections: readonly ShopExportSelection[],
  lookup: ShopExportLookup,
): ShopExportResult => {
  const lines = new Map<string, ShopExportLine>();
  const blockers: ShopExportBlocker[] = [];

  for (const selection of selections) {
    const entry = lookup(selection.slot, selection.rebrickablePartNum);
    if (!entry) {
      blockers.push(block(selection, "not-indexed"));
      continue;
    }
    const [onlyColor, ...otherColors] = entry.colors;
    if (!onlyColor) {
      blockers.push(block(selection, "no-color"));
      continue;
    }
    const color = selection.rebrickableColorId === undefined
      ? otherColors.length === 0 ? onlyColor : undefined
      : entry.colors.find(({ rebrickableColorId }) => rebrickableColorId === selection.rebrickableColorId);
    if (selection.rebrickableColorId !== undefined && !color) {
      blockers.push(block(selection, "invalid-color"));
      continue;
    }
    if (!color) {
      blockers.push(block(selection, "multiple-colors"));
      continue;
    }
    let elementId: string | null = null;
    if (target === "lego-pick-a-brick") {
      const [onlyElementId, ...otherElementIds] = color.elementIds;
      if (!onlyElementId) {
        blockers.push(block(selection, "no-element-id"));
        continue;
      }
      if (otherElementIds.length > 0) {
        blockers.push(block(selection, "multiple-element-ids"));
        continue;
      }
      elementId = onlyElementId;
    }

    const key = elementId ?? `${entry.rebrickablePartNum}\u0000${color.rebrickableColorId}`;
    const line = lines.get(key);
    if (line) {
      line.quantity += 1;
      line.names.push(selection.name);
      line.slots.push(selection.slot);
    } else {
      lines.set(key, {
        rebrickablePartNum: entry.rebrickablePartNum,
        rebrickableColorId: color.rebrickableColorId,
        colorName: color.colorName,
        elementId,
        quantity: 1,
        names: [selection.name],
        slots: [selection.slot],
      });
    }
  }

  const sortedLines = [...lines.values()].sort((left, right) =>
    left.rebrickablePartNum.localeCompare(right.rebrickablePartNum, "en")
    || left.rebrickableColorId - right.rebrickableColorId);
  const status = selections.length === 0
    ? "empty"
    : blockers.length === 0
      ? "complete"
      : sortedLines.length > 0 ? "partial" : "blocked";
  return { target, status, lines: sortedLines, blockers };
};

/** Explains the compiled result for every selected figure slot without changing export eligibility. */
export const describeShopExportCoverage = (
  selections: readonly ShopExportSelection[],
  result: ShopExportResult,
): ShopExportCoverage[] => selections.map((selection) => {
  const blocker = result.blockers.find((candidate) =>
    candidate.slot === selection.slot
    && candidate.rebrickablePartNum === selection.rebrickablePartNum);
  if (blocker) {
    return { selection, status: "blocked", reason: blocker.reason };
  }
  const included = result.lines.some((line) =>
    line.rebrickablePartNum === selection.rebrickablePartNum
    && line.slots.includes(selection.slot));
  if (!included) {
    throw new Error(`Export coverage invariant failed for ${selection.slot}:${selection.rebrickablePartNum}`);
  }
  return { selection, status: "included" };
});

const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
};

const toCsv = (header: readonly string[], rows: ReadonlyArray<ReadonlyArray<string | number>>): string =>
  [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n").concat("\n");

/** Rebrickable part list import: Rebrickable part number, Rebrickable colour ID, quantity. */
export const serializeRebrickableCsv = (result: ShopExportResult): string => {
  if (result.target !== "rebrickable") throw new Error("Not a Rebrickable export");
  return toCsv(
    ["Part", "Color", "Quantity"],
    result.lines.map((line) => [line.rebrickablePartNum, line.rebrickableColorId, line.quantity]),
  );
};

/** LEGO Pick a Brick upload: LEGO element ID and quantity. */
export const serializePickABrickCsv = (result: ShopExportResult): string => {
  if (result.target !== "lego-pick-a-brick") throw new Error("Not a Pick a Brick export");
  return toCsv(
    ["elementId", "quantity"],
    result.lines.map((line) => {
      if (!line.elementId) throw new Error(`Pick a Brick line without element ID: ${line.rebrickablePartNum}`);
      return [line.elementId, line.quantity];
    }),
  );
};
