import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { bricklinkKeywordIds, rebrickableKeywordIds } from "./ldraw-keywords.js";

export const BRICKLINK_ITEM_CROSSWALK_FILE = "data/generated/bricklink-item-crosswalk.json";
export const BRICKLINK_CATALOG_SOURCE_POLICY =
  "Official BrickLink Catalog Download plus hash-locked official LDraw header IDs; no API." as const;

export type BrickLinkCrosswalkEvidenceMethod =
  | "part-color-code"
  | "catalog-primary-item-number"
  | "catalog-alternate-item-number"
  | "official-ldraw-header";

export type BrickLinkItemCrosswalkEntry = {
  rebrickablePartNum: string;
  bricklinkItemId: string;
  evidenceMethods: BrickLinkCrosswalkEvidenceMethod[];
  matchingElementIds: string[];
};

export type BrickLinkItemCrosswalkUnresolved = {
  rebrickablePartNum: string;
  /**
   * `not-in-snapshot`: the part entered the builder catalog after the BrickLink catalog snapshot
   * was imported and has no official LDraw header ID. It stays blocked until the snapshot is renewed.
   */
  reason: "ambiguous-official-crosswalk" | "no-official-crosswalk" | "not-in-snapshot";
  candidateBricklinkItemIds: string[];
  matchingElementIds: string[];
};

export type BrickLinkItemCrosswalk = {
  schemaVersion: 1;
  sourcePolicy: typeof BRICKLINK_CATALOG_SOURCE_POLICY;
  /** Day (YYYY-MM-DD) the official BrickLink catalog tables were downloaded and imported. */
  snapshotDate: string;
  catalogSourceLockSha256: string;
  sources: {
    parts: { fileName: string; sha256: string; rowCount: number };
    partColorCodes: { fileName: string; sha256: string; rowCount: number };
    ldrawOfficial: { release: string; archiveSha256: string; mappedPartCount: number } | null;
  };
  summary: {
    builderPartCount: number;
    mappedPartCount: number;
    unresolvedPartCount: number;
    ambiguousPartCount: number;
    noEvidencePartCount: number;
    notInSnapshotPartCount: number;
    ldrawHeaderMappedPartCount: number;
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
  source: { release: string; archiveSha256: string };
  entries: Array<{ rebrickablePartNum: string; ldrawFile: string }>;
};

type CuratedAssortment = {
  components: Array<{ rebrickablePartNum: string }>;
};

type CatalogSources = {
  snapshotDate: string;
  partsText: string;
  partsFileName: string;
  partColorCodesText: string;
  partColorCodesFileName: string;
};

type LDrawBrickLinkEvidence = {
  release: string;
  archiveSha256: string;
  itemIdByRebrickablePartNum: ReadonlyMap<string, string>;
};

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

const uniqueSorted = (values: Iterable<string>): string[] => [...new Set(values)].sort((left, right) =>
  left.localeCompare(right, "en"));

const ldrawBaseName = (path: string): string =>
  path.split("/").at(-1)?.replace(/\.(?:dat|ldr)$/iu, "") ?? "";

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
  ldrawEvidence?: LDrawBrickLinkEvidence,
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
    const ldrawItemId = ldrawEvidence?.itemIdByRebrickablePartNum.get(rebrickablePartNum.toLowerCase());
    if (ldrawItemId) {
      const catalogConfirmsSameItem = candidates.length === 1 && candidates[0] === ldrawItemId;
      entries.push({
        rebrickablePartNum,
        bricklinkItemId: ldrawItemId,
        evidenceMethods: uniqueSorted([
          "official-ldraw-header",
          ...(catalogConfirmsSameItem ? evidenceMethods : []),
        ]) as BrickLinkCrosswalkEvidenceMethod[],
        matchingElementIds: catalogConfirmsSameItem ? uniqueSorted(matchingElementIds) : [],
      });
      continue;
    }
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
    snapshotDate: sources.snapshotDate,
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
      ldrawOfficial: ldrawEvidence
        ? {
            release: ldrawEvidence.release,
            archiveSha256: ldrawEvidence.archiveSha256,
            mappedPartCount: ldrawEvidence.itemIdByRebrickablePartNum.size,
          }
        : null,
    },
    summary: {
      builderPartCount: builderPartNums.length,
      mappedPartCount: entries.length,
      unresolvedPartCount: unresolved.length,
      ambiguousPartCount: unresolved.filter(({ reason }) => reason === "ambiguous-official-crosswalk").length,
      noEvidencePartCount: unresolved.filter(({ reason }) => reason === "no-official-crosswalk").length,
      notInSnapshotPartCount: unresolved.filter(({ reason }) => reason === "not-in-snapshot").length,
      ldrawHeaderMappedPartCount: entries.filter(({ evidenceMethods }) =>
        evidenceMethods.includes("official-ldraw-header")).length,
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
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value.snapshotDate) || Number.isNaN(Date.parse(value.snapshotDate))) {
    throw new Error("Invalid BrickLink snapshot date");
  }
  for (const source of Object.values(value.sources)) {
    if (source && "sha256" in source
      && (!/^[a-f0-9]{64}$/u.test(source.sha256) || source.rowCount < 1)) {
      throw new Error("Invalid BrickLink source metadata");
    }
  }
  if (value.sources.ldrawOfficial
    && (!value.sources.ldrawOfficial.release
      || !/^[a-f0-9]{64}$/u.test(value.sources.ldrawOfficial.archiveSha256)
      || value.sources.ldrawOfficial.mappedPartCount < 1)) {
    throw new Error("Invalid official LDraw source metadata");
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
    const validReason = entry.candidateBricklinkItemIds.length > 1
      ? entry.reason === "ambiguous-official-crosswalk"
      : entry.reason === "no-official-crosswalk"
        || (entry.reason === "not-in-snapshot" && entry.candidateBricklinkItemIds.length === 0);
    if (!validReason) throw new Error(`Invalid unresolved reason: ${entry.rebrickablePartNum}`);
  }
  const ambiguousPartCount = value.unresolved.filter(({ reason }) => reason === "ambiguous-official-crosswalk").length;
  const noEvidencePartCount = value.unresolved.filter(({ reason }) => reason === "no-official-crosswalk").length;
  const notInSnapshotPartCount = value.unresolved.filter(({ reason }) => reason === "not-in-snapshot").length;
  if (value.summary.builderPartCount !== allPartNums.length
    || value.summary.mappedPartCount !== value.entries.length
    || value.summary.unresolvedPartCount !== value.unresolved.length
    || value.summary.ambiguousPartCount !== ambiguousPartCount
    || value.summary.noEvidencePartCount !== noEvidencePartCount
    || value.summary.notInSnapshotPartCount !== notInSnapshotPartCount
    || value.summary.ldrawHeaderMappedPartCount !== value.entries.filter(({ evidenceMethods }) =>
      evidenceMethods.includes("official-ldraw-header")).length) {
    throw new Error("BrickLink crosswalk summary does not match its entries");
  }
}

async function readOfficialLDrawBrickLinkEvidence(
  root: string,
  builderCatalog: BuilderCatalog,
): Promise<LDrawBrickLinkEvidence> {
  const sourceCache = new Map<string, Promise<string>>();
  const candidatesByPartNum = new Map<string, Set<string>>();
  for (const entry of builderCatalog.entries) {
    let sourcePromise = sourceCache.get(entry.ldrawFile);
    if (!sourcePromise) {
      sourcePromise = readFile(resolve(root, "data/incoming/ldraw-official/extracted/ldraw", entry.ldrawFile), "utf8");
      sourceCache.set(entry.ldrawFile, sourcePromise);
    }
    const lines = (await sourcePromise).split(/\r?\n/u);
    const rebrickableIds = uniqueSorted(lines.flatMap(rebrickableKeywordIds));
    const provesPart = rebrickableIds.some((id) => id.toLowerCase() === entry.rebrickablePartNum.toLowerCase())
      || ldrawBaseName(entry.ldrawFile).toLowerCase() === entry.rebrickablePartNum.toLowerCase();
    if (!provesPart) continue;
    const bricklinkIds = uniqueSorted(lines.flatMap(bricklinkKeywordIds));
    if (bricklinkIds.length !== 1) continue;
    addToSetMap(candidatesByPartNum, entry.rebrickablePartNum.toLowerCase(), bricklinkIds[0]!);
  }
  const itemIdByRebrickablePartNum = new Map<string, string>();
  for (const [partNum, candidates] of candidatesByPartNum) {
    if (candidates.size === 1) itemIdByRebrickablePartNum.set(partNum, [...candidates][0]!);
  }
  return {
    release: builderCatalog.source.release,
    archiveSha256: builderCatalog.source.archiveSha256,
    itemIdByRebrickablePartNum,
  };
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
  snapshotDate: string = new Date().toISOString().slice(0, 10),
): Promise<BrickLinkItemCrosswalk> {
  const [normalized, builderCatalog, curated, partsText, partColorCodesText] = await Promise.all([
    readFile(resolve(root, "data/generated/catalog-normalized.json"), "utf8").then((value) => JSON.parse(value) as NormalizedCatalog),
    readFile(resolve(root, "data/generated/ldraw-expanded-catalog.json"), "utf8").then((value) => JSON.parse(value) as BuilderCatalog),
    readFile(resolve(root, "data/curated/ff03-test-assortment.json"), "utf8").then((value) => JSON.parse(value) as CuratedAssortment),
    readFile(partsPath, "utf8"),
    readFile(partColorCodesPath, "utf8"),
  ]);
  const ldrawEvidence = await readOfficialLDrawBrickLinkEvidence(root, builderCatalog);
  const crosswalk = buildBrickLinkItemCrosswalk(normalized, builderCatalog, curated, {
    snapshotDate,
    partsText,
    partsFileName: partsPath,
    partColorCodesText,
    partColorCodesFileName: partColorCodesPath,
  }, ldrawEvidence);
  validateBrickLinkItemCrosswalk(crosswalk);
  await writeFile(resolve(root, BRICKLINK_ITEM_CROSSWALK_FILE), `${JSON.stringify(crosswalk)}\n`, "utf8");
  return crosswalk;
}

/**
 * Keeps the crosswalk aligned with the current catalog without a new BrickLink download.
 * Existing mappings (the BrickLink snapshot) stay untouched; parts that are new to the builder
 * catalog are mapped only through official LDraw header IDs and otherwise marked
 * `not-in-snapshot`. Parts that left the builder catalog are dropped. The result is
 * deterministic: no timestamps, the snapshot date stays the day of the BrickLink download.
 */
export function refreshBrickLinkItemCrosswalk(
  previous: BrickLinkItemCrosswalk,
  normalized: NormalizedCatalog,
  builderCatalog: BuilderCatalog,
  curated: CuratedAssortment,
  ldrawEvidence?: LDrawBrickLinkEvidence,
): BrickLinkItemCrosswalk {
  const normalizedParts = new Set(normalized.parts.map((part) => part.partNum.toLowerCase()));
  const builderPartNums = uniqueSorted([
    ...builderCatalog.entries.map(({ rebrickablePartNum }) => rebrickablePartNum),
    ...curated.components.map(({ rebrickablePartNum }) => rebrickablePartNum),
  ]);
  const previousEntries = new Map(previous.entries.map((entry) => [entry.rebrickablePartNum.toLowerCase(), entry]));
  const previousUnresolved = new Map(previous.unresolved.map((entry) => [entry.rebrickablePartNum.toLowerCase(), entry]));
  const entries: BrickLinkItemCrosswalkEntry[] = [];
  const unresolved: BrickLinkItemCrosswalkUnresolved[] = [];

  for (const rebrickablePartNum of builderPartNums) {
    const key = rebrickablePartNum.toLowerCase();
    if (!normalizedParts.has(key)) throw new Error(`Builder part is missing from the normalized catalog: ${rebrickablePartNum}`);
    const kept = previousEntries.get(key);
    if (kept) {
      entries.push({ ...kept, rebrickablePartNum });
      continue;
    }
    const ldrawItemId = ldrawEvidence?.itemIdByRebrickablePartNum.get(key);
    if (ldrawItemId) {
      entries.push({
        rebrickablePartNum,
        bricklinkItemId: ldrawItemId,
        evidenceMethods: ["official-ldraw-header"],
        matchingElementIds: [],
      });
      continue;
    }
    const open = previousUnresolved.get(key);
    unresolved.push(open
      ? { ...open, rebrickablePartNum }
      : { rebrickablePartNum, reason: "not-in-snapshot", candidateBricklinkItemIds: [], matchingElementIds: [] });
  }

  return {
    schemaVersion: 1,
    sourcePolicy: BRICKLINK_CATALOG_SOURCE_POLICY,
    snapshotDate: previous.snapshotDate,
    catalogSourceLockSha256: normalized.sourceLockSha256,
    sources: {
      ...previous.sources,
      ldrawOfficial: ldrawEvidence
        ? {
            release: ldrawEvidence.release,
            archiveSha256: ldrawEvidence.archiveSha256,
            mappedPartCount: ldrawEvidence.itemIdByRebrickablePartNum.size,
          }
        : previous.sources.ldrawOfficial,
    },
    summary: {
      builderPartCount: builderPartNums.length,
      mappedPartCount: entries.length,
      unresolvedPartCount: unresolved.length,
      ambiguousPartCount: unresolved.filter(({ reason }) => reason === "ambiguous-official-crosswalk").length,
      noEvidencePartCount: unresolved.filter(({ reason }) => reason === "no-official-crosswalk").length,
      notInSnapshotPartCount: unresolved.filter(({ reason }) => reason === "not-in-snapshot").length,
      ldrawHeaderMappedPartCount: entries.filter(({ evidenceMethods }) =>
        evidenceMethods.includes("official-ldraw-header")).length,
    },
    entries,
    unresolved,
  };
}

/** Whole days between the BrickLink snapshot and `now`. */
export const bricklinkSnapshotAgeDays = (snapshotDate: string, now: Date): number =>
  Math.floor((now.getTime() - Date.parse(`${snapshotDate}T00:00:00Z`)) / 86_400_000);

export const BRICKLINK_SNAPSHOT_MAX_AGE_DAYS = 90;

/**
 * Rewrites the crosswalk file only when its content changes. Official LDraw header evidence
 * is used when the pinned LDraw library is extracted (the catalog refresh does that); without it
 * new parts simply stay `not-in-snapshot`.
 */
export async function refreshBrickLinkItemCrosswalkFile(root: string): Promise<{ changed: boolean; crosswalk: BrickLinkItemCrosswalk }> {
  const [previous, normalized, builderCatalog, curated] = await Promise.all([
    readBrickLinkItemCrosswalk(root),
    readFile(resolve(root, "data/generated/catalog-normalized.json"), "utf8").then((value) => JSON.parse(value) as NormalizedCatalog),
    readFile(resolve(root, "data/generated/ldraw-expanded-catalog.json"), "utf8").then((value) => JSON.parse(value) as BuilderCatalog),
    readFile(resolve(root, "data/curated/ff03-test-assortment.json"), "utf8").then((value) => JSON.parse(value) as CuratedAssortment),
  ]);
  let ldrawEvidence: LDrawBrickLinkEvidence | undefined;
  try {
    ldrawEvidence = await readOfficialLDrawBrickLinkEvidence(root, builderCatalog);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const crosswalk = refreshBrickLinkItemCrosswalk(previous, normalized, builderCatalog, curated, ldrawEvidence);
  validateBrickLinkItemCrosswalk(crosswalk);
  const next = `${JSON.stringify(crosswalk)}\n`;
  const current = await readFile(resolve(root, BRICKLINK_ITEM_CROSSWALK_FILE), "utf8");
  if (next === current) return { changed: false, crosswalk };
  await writeFile(resolve(root, BRICKLINK_ITEM_CROSSWALK_FILE), next, "utf8");
  return { changed: true, crosswalk };
}
