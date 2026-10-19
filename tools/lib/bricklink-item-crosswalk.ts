import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

export const BRICKLINK_ITEM_CROSSWALK_FILE = "data/generated/bricklink-item-crosswalk.json";
export const BRICKLINK_CATALOG_SOURCE_POLICY =
  "Official BrickLink Catalog Download: Parts and Part and Color Codes; no API." as const;

export type BrickLinkCrosswalkEvidenceMethod =
  | "part-color-code"
  | "catalog-primary-item-number"
  | "catalog-alternate-item-number";

export type BrickLinkItemCrosswalkEntry = {
  rebrickablePartNum: string;
  bricklinkItemId: string;
  evidenceMethods: BrickLinkCrosswalkEvidenceMethod[];
  matchingElementIds: string[];
};

export type BrickLinkItemCrosswalkUnresolved = {
  rebrickablePartNum: string;
  reason: "ambiguous-official-crosswalk" | "no-official-crosswalk";
  candidateBricklinkItemIds: string[];
  matchingElementIds: string[];
};

export type BrickLinkItemCrosswalk = {
  schemaVersion: 1;
  sourcePolicy: typeof BRICKLINK_CATALOG_SOURCE_POLICY;
  catalogSourceLockSha256: string;
  sources: {
    parts: { fileName: string; sha256: string; rowCount: number };
    partColorCodes: { fileName: string; sha256: string; rowCount: number };
  };
  summary: {
    builderPartCount: number;
    mappedPartCount: number;
    unresolvedPartCount: number;
    ambiguousPartCount: number;
    noEvidencePartCount: number;
  };
  entries: BrickLinkItemCrosswalkEntry[];
  unresolved: BrickLinkItemCrosswalkUnresolved[];
};

type NormalizedCatalog = {
  sourceLockSha256: string;
  parts: Array<{
    partNum: string;
    colorVariants: Array<{ elementId: string }>;
  }>;
};

type BuilderCatalog = {
  entries: Array<{ rebrickablePartNum: string }>;
};

type CuratedAssortment = {
  components: Array<{ rebrickablePartNum: string }>;
};

type CatalogSources = {
  partsText: string;
  partsFileName: string;
  partColorCodesText: string;
  partColorCodesFileName: string;
};

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

const uniqueSorted = (values: Iterable<string>): string[] => [...new Set(values)].sort((left, right) =>
  left.localeCompare(right, "en"));

const dataLines = (text: string): string[] => text.replace(/\r/gu, "").split("\n").filter((line) => line.length > 0);

const addToSetMap = (map: Map<string, Set<string>>, key: string, value: string): void => {
  const values = map.get(key) ?? new Set<string>();
  values.add(value);
  map.set(key, values);
};

function parsePartsCatalog(text: string): {
  rowCount: number;
  primaryByLowercase: Map<string, string>;
  primaryByAlternateLowercase: Map<string, Set<string>>;
} {
  const lines = dataLines(text);
  if (lines.shift() !== "Category ID\tCategory Name\tNumber\tName\tAlternate Item Number") {
    throw new Error("Unexpected BrickLink Parts catalog header");
  }
  const primaryByLowercase = new Map<string, string>();
  const primaryByAlternateLowercase = new Map<string, Set<string>>();
  for (const line of lines) {
    const columns = line.split("\t");
    const itemNumber = columns[2]?.trim();
    if (!itemNumber) throw new Error("BrickLink Parts catalog row is missing its item number");
    primaryByLowercase.set(itemNumber.toLowerCase(), itemNumber);
    for (const alternate of (columns[4] ?? "").split(",").map((value) => value.trim()).filter(Boolean)) {
      addToSetMap(primaryByAlternateLowercase, alternate.toLowerCase(), itemNumber);
    }
  }
  return { rowCount: lines.length, primaryByLowercase, primaryByAlternateLowercase };
}

function parsePartColorCodes(text: string, knownItemNumbers: ReadonlyMap<string, string>): {
  rowCount: number;
  itemNumbersByElementId: Map<string, Set<string>>;
} {
  const lines = dataLines(text);
  if (lines.shift() !== "Item No\tColor\tCode") {
    throw new Error("Unexpected BrickLink Part and Color Codes header");
  }
  const itemNumbersByElementId = new Map<string, Set<string>>();
  for (const line of lines) {
    const [rawItemNumber, , rawElementId] = line.split("\t");
    const itemNumber = rawItemNumber?.trim();
    const elementId = rawElementId?.trim();
    if (!itemNumber || !elementId) throw new Error("BrickLink Part and Color Codes row is incomplete");
    const canonicalItemNumber = knownItemNumbers.get(itemNumber.toLowerCase());
    if (!canonicalItemNumber) {
      throw new Error(`BrickLink Part and Color Codes references an unknown item: ${itemNumber}`);
    }
    addToSetMap(itemNumbersByElementId, elementId, canonicalItemNumber);
  }
  return { rowCount: lines.length, itemNumbersByElementId };
}

export function buildBrickLinkItemCrosswalk(
  normalized: NormalizedCatalog,
  builderCatalog: BuilderCatalog,
  curated: CuratedAssortment,
  sources: CatalogSources,
): BrickLinkItemCrosswalk {
  const partsCatalog = parsePartsCatalog(sources.partsText);
  const partColorCodes = parsePartColorCodes(sources.partColorCodesText, partsCatalog.primaryByLowercase);
  const normalizedByPart = new Map(normalized.parts.map((part) => [part.partNum.toLowerCase(), part]));
  const builderPartNums = uniqueSorted([
    ...builderCatalog.entries.map(({ rebrickablePartNum }) => rebrickablePartNum),
    ...curated.components.map(({ rebrickablePartNum }) => rebrickablePartNum),
  ]);
  const entries: BrickLinkItemCrosswalkEntry[] = [];
  const unresolved: BrickLinkItemCrosswalkUnresolved[] = [];

  for (const rebrickablePartNum of builderPartNums) {
    const normalizedPart = normalizedByPart.get(rebrickablePartNum.toLowerCase());
    if (!normalizedPart) throw new Error(`Builder part is missing from the normalized catalog: ${rebrickablePartNum}`);
    const candidateItemIds = new Set<string>();
    const evidenceMethods = new Set<BrickLinkCrosswalkEvidenceMethod>();
    const matchingElementIds = new Set<string>();
    for (const elementId of uniqueSorted(normalizedPart.colorVariants.map(({ elementId }) => elementId).filter(Boolean))) {
      const itemIds = partColorCodes.itemNumbersByElementId.get(elementId);
      if (!itemIds) continue;
      evidenceMethods.add("part-color-code");
      matchingElementIds.add(elementId);
      for (const itemId of itemIds) candidateItemIds.add(itemId);
    }
    const primaryItemId = partsCatalog.primaryByLowercase.get(rebrickablePartNum.toLowerCase());
    if (primaryItemId) {
      evidenceMethods.add("catalog-primary-item-number");
      candidateItemIds.add(primaryItemId);
    }
    const alternateItemIds = partsCatalog.primaryByAlternateLowercase.get(rebrickablePartNum.toLowerCase());
    if (alternateItemIds) {
      evidenceMethods.add("catalog-alternate-item-number");
      for (const itemId of alternateItemIds) candidateItemIds.add(itemId);
    }
    const candidates = uniqueSorted(candidateItemIds);
    if (candidates.length === 1) {
      entries.push({
        rebrickablePartNum,
        bricklinkItemId: candidates[0]!,
        evidenceMethods: [...evidenceMethods].sort(),
        matchingElementIds: uniqueSorted(matchingElementIds),
      });
    } else {
      unresolved.push({
        rebrickablePartNum,
        reason: candidates.length > 1 ? "ambiguous-official-crosswalk" : "no-official-crosswalk",
        candidateBricklinkItemIds: candidates,
        matchingElementIds: uniqueSorted(matchingElementIds),
      });
    }
  }

  return {
    schemaVersion: 1,
    sourcePolicy: BRICKLINK_CATALOG_SOURCE_POLICY,
    catalogSourceLockSha256: normalized.sourceLockSha256,
    sources: {
      parts: {
        fileName: basename(sources.partsFileName),
        sha256: sha256(sources.partsText),
        rowCount: partsCatalog.rowCount,
      },
      partColorCodes: {
        fileName: basename(sources.partColorCodesFileName),
        sha256: sha256(sources.partColorCodesText),
        rowCount: partColorCodes.rowCount,
      },
    },
    summary: {
      builderPartCount: builderPartNums.length,
      mappedPartCount: entries.length,
      unresolvedPartCount: unresolved.length,
      ambiguousPartCount: unresolved.filter(({ reason }) => reason === "ambiguous-official-crosswalk").length,
      noEvidencePartCount: unresolved.filter(({ reason }) => reason === "no-official-crosswalk").length,
    },
    entries,
    unresolved,
  };
}

export function validateBrickLinkItemCrosswalk(value: BrickLinkItemCrosswalk): void {
  if (value.schemaVersion !== 1 || value.sourcePolicy !== BRICKLINK_CATALOG_SOURCE_POLICY) {
    throw new Error("BrickLink item crosswalk schema or source policy mismatch");
  }
  if (!/^[a-f0-9]{64}$/u.test(value.catalogSourceLockSha256)) throw new Error("Invalid catalog source lock hash");
  for (const source of Object.values(value.sources)) {
    if (!/^[a-f0-9]{64}$/u.test(source.sha256) || source.rowCount < 1) throw new Error("Invalid BrickLink source metadata");
  }
  const allPartNums = [...value.entries, ...value.unresolved].map(({ rebrickablePartNum }) => rebrickablePartNum.toLowerCase());
  if (new Set(allPartNums).size !== allPartNums.length) throw new Error("BrickLink crosswalk part numbers must be unique");
  for (const entry of value.entries) {
    if (!/^[A-Za-z0-9._-]{1,64}$/u.test(entry.bricklinkItemId) || entry.evidenceMethods.length < 1) {
      throw new Error(`Invalid mapped BrickLink entry: ${entry.rebrickablePartNum}`);
    }
    if (entry.matchingElementIds.some((elementId) => !/^[0-9]{1,16}$/u.test(elementId))) {
      throw new Error(`Invalid matching element ID: ${entry.rebrickablePartNum}`);
    }
  }
  for (const entry of value.unresolved) {
    const expectedReason = entry.candidateBricklinkItemIds.length > 1
      ? "ambiguous-official-crosswalk"
      : "no-official-crosswalk";
    if (entry.reason !== expectedReason) throw new Error(`Invalid unresolved reason: ${entry.rebrickablePartNum}`);
  }
  const ambiguousPartCount = value.unresolved.filter(({ reason }) => reason === "ambiguous-official-crosswalk").length;
  const noEvidencePartCount = value.unresolved.filter(({ reason }) => reason === "no-official-crosswalk").length;
  if (value.summary.builderPartCount !== allPartNums.length
    || value.summary.mappedPartCount !== value.entries.length
    || value.summary.unresolvedPartCount !== value.unresolved.length
    || value.summary.ambiguousPartCount !== ambiguousPartCount
    || value.summary.noEvidencePartCount !== noEvidencePartCount) {
    throw new Error("BrickLink crosswalk summary does not match its entries");
  }
}

export async function readBrickLinkItemCrosswalk(root: string): Promise<BrickLinkItemCrosswalk> {
  const value = JSON.parse(await readFile(resolve(root, BRICKLINK_ITEM_CROSSWALK_FILE), "utf8")) as BrickLinkItemCrosswalk;
  validateBrickLinkItemCrosswalk(value);
  return value;
}

export async function importBrickLinkItemCrosswalk(
  root: string,
  partsPath: string,
  partColorCodesPath: string,
): Promise<BrickLinkItemCrosswalk> {
  const [normalized, builderCatalog, curated, partsText, partColorCodesText] = await Promise.all([
    readFile(resolve(root, "data/generated/catalog-normalized.json"), "utf8").then((value) => JSON.parse(value) as NormalizedCatalog),
    readFile(resolve(root, "data/generated/ldraw-expanded-catalog.json"), "utf8").then((value) => JSON.parse(value) as BuilderCatalog),
    readFile(resolve(root, "data/curated/ff03-test-assortment.json"), "utf8").then((value) => JSON.parse(value) as CuratedAssortment),
    readFile(partsPath, "utf8"),
    readFile(partColorCodesPath, "utf8"),
  ]);
  const crosswalk = buildBrickLinkItemCrosswalk(normalized, builderCatalog, curated, {
    partsText,
    partsFileName: partsPath,
    partColorCodesText,
    partColorCodesFileName: partColorCodesPath,
  });
  validateBrickLinkItemCrosswalk(crosswalk);
  await writeFile(resolve(root, BRICKLINK_ITEM_CROSSWALK_FILE), `${JSON.stringify(crosswalk)}\n`, "utf8");
  return crosswalk;
}
