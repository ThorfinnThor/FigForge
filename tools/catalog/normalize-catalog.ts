import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { sourceLockSchema, type SourceLock } from "../../src/contracts/source-lock.js";
import {
  normalizedCatalogSchema,
  type NormalizedCatalog,
} from "../../src/contracts/catalog-refresh.js";
import { parseCsv, requireColumns, type CsvTable } from "../../src/catalog/csv.js";

const SOURCE_POLICY = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;
const REQUIRED_FILES = ["colors.csv.gz", "part_categories.csv.gz", "parts.csv.gz"] as const;
const ALLOWED_FILES = [
  "colors.csv.gz",
  "part_categories.csv.gz",
  "parts.csv.gz",
  "part_relationships.csv.gz",
  "elements.csv.gz",
] as const;

export type CatalogArtifactBytes = {
  fileName: (typeof ALLOWED_FILES)[number];
  bytes: Uint8Array;
};

export type CatalogRefreshResult = {
  sourceLock: SourceLock;
  normalizedCatalog: NormalizedCatalog;
  changedArtifacts: string[];
};

const stableSlug = (value: string): string => {
  const slug = value.toLowerCase().replace(/[^a-z0-9._:-]+/gu, "-").replace(/^-+|-+$/gu, "");
  return slug || "unknown";
};

const evidenceId = (fileName: string, key: string, value: string): string =>
  `evidence:catalog:${stableSlug(fileName)}:${stableSlug(key)}:${stableSlug(value)}`;

const decodeCsv = (bytes: Uint8Array, fileName: string): string => {
  const decoded = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
    ? gunzipSync(bytes)
    : bytes;
  const text = new TextDecoder("utf-8", { fatal: true }).decode(decoded);
  if (/\bmoc(?:[-_ ]|$)/iu.test(text)) {
    throw new Error(`Forbidden MOC content detected in ${fileName}`);
  }
  return text;
};

const parseInteger = (value: string, field: string, fileName: string): number => {
  if (!/^\d+$/u.test(value)) {
    throw new Error(`CSV ${fileName} has an invalid integer in ${field}: ${value}`);
  }
  return Number(value);
};

const parseHex = (value: string, fileName: string): string => {
  const normalized = value.toUpperCase();
  if (!/^[0-9A-F]{6}$/u.test(normalized)) {
    throw new Error(`CSV ${fileName} has an invalid RGB value: ${value}`);
  }
  return normalized;
};

const parseTables = (artifacts: readonly CatalogArtifactBytes[]): Map<string, CsvTable> => {
  const tables = new Map<string, CsvTable>();
  for (const artifact of artifacts) {
    if (!ALLOWED_FILES.includes(artifact.fileName)) {
      throw new Error(`Catalog artifact is not allowlisted: ${artifact.fileName}`);
    }
    if (tables.has(artifact.fileName)) {
      throw new Error(`Catalog artifact is duplicated: ${artifact.fileName}`);
    }
    tables.set(artifact.fileName, parseCsv(decodeCsv(artifact.bytes, artifact.fileName), artifact.fileName));
  }
  for (const required of REQUIRED_FILES) {
    if (!tables.has(required)) {
      throw new Error(`Required catalog artifact is missing: ${required}`);
    }
  }
  return tables;
};

const hashBytes = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const serializeLock = (lock: SourceLock): string => `${JSON.stringify(lock, null, 2)}\n`;

export const normalizeCatalogArtifacts = ({
  sourceLock: rawSourceLock,
  artifacts,
  allowHashUpdates,
  retrievedAt,
}: {
  sourceLock: SourceLock;
  artifacts: readonly CatalogArtifactBytes[];
  allowHashUpdates: boolean;
  retrievedAt: string;
}): CatalogRefreshResult => {
  const sourceLock = sourceLockSchema.parse(rawSourceLock);
  const source = sourceLock.sources[0];
  const tables = parseTables(artifacts);
  const artifactByName = new Map(artifacts.map((artifact) => [artifact.fileName, artifact]));
  const changedArtifacts: string[] = [];
  const nextArtifacts = source.artifacts.map((lockedArtifact) => {
    const artifact = artifactByName.get(lockedArtifact.fileName);
    if (!artifact) {
      if (lockedArtifact.required) {
        throw new Error(`Required catalog artifact is missing: ${lockedArtifact.fileName}`);
      }
      return lockedArtifact;
    }
    const actualSha256 = hashBytes(artifact.bytes);
    if (lockedArtifact.sha256 !== actualSha256) {
      if (!allowHashUpdates) {
        throw new Error(`SHA-256 mismatch for ${lockedArtifact.fileName}`);
      }
      changedArtifacts.push(lockedArtifact.fileName);
      return { ...lockedArtifact, sha256: actualSha256, retrievedAt };
    }
    return lockedArtifact;
  });
  const nextSourceLock: SourceLock = {
    ...sourceLock,
    sources: [{ ...source, artifacts: nextArtifacts }],
  };

  const colors = tables.get("colors.csv.gz")!;
  const categories = tables.get("part_categories.csv.gz")!;
  const parts = tables.get("parts.csv.gz")!;
  const elements = tables.get("elements.csv.gz");
  const relationships = tables.get("part_relationships.csv.gz");
  requireColumns(colors, "colors.csv.gz", ["id", "name", "rgb"]);
  requireColumns(categories, "part_categories.csv.gz", ["id", "name"]);
  requireColumns(parts, "parts.csv.gz", ["part_num", "name", "part_cat_id", "part_material"]);
  if (elements) requireColumns(elements, "elements.csv.gz", ["element_id", "part_num", "color_id"]);
  if (relationships) requireColumns(relationships, "part_relationships.csv.gz", ["rel_type", "child_part_num", "parent_part_num"]);

  const colorById = new Map<number, { name: string; rgb: string }>();
  for (const row of colors.rows) {
    const id = parseInteger(row.id ?? "", "id", "colors.csv.gz");
    if (colorById.has(id)) throw new Error(`Duplicate color ID in colors.csv.gz: ${id}`);
    colorById.set(id, { name: row.name ?? "", rgb: parseHex(row.rgb ?? "", "colors.csv.gz") });
  }
  const categoryById = new Map<number, string>();
  for (const row of categories.rows) {
    const id = parseInteger(row.id ?? "", "id", "part_categories.csv.gz");
    if (categoryById.has(id)) throw new Error(`Duplicate category ID in part_categories.csv.gz: ${id}`);
    categoryById.set(id, row.name ?? "");
  }
  const elementsByPart = new Map<string, { elementId: string; colorId: number }[]>();
  const elementIds = new Set<string>();
  for (const row of elements?.rows ?? []) {
    const partNum = row.part_num ?? "";
    const elementId = row.element_id ?? "";
    const colorId = parseInteger(row.color_id ?? "", "color_id", "elements.csv.gz");
    if (!elementId || elementIds.has(elementId)) throw new Error(`Duplicate or empty element ID in elements.csv.gz: ${elementId}`);
    if (!colorById.has(colorId)) throw new Error(`Element references unknown color ${colorId}`);
    elementIds.add(elementId);
    const values = elementsByPart.get(partNum) ?? [];
    values.push({ elementId, colorId });
    elementsByPart.set(partNum, values);
  }
  const relationshipCounts = new Map<string, number>();
  for (const row of relationships?.rows ?? []) {
    const parent = row.parent_part_num ?? "";
    relationshipCounts.set(parent, (relationshipCounts.get(parent) ?? 0) + 1);
  }
  const seenParts = new Set<string>();
  const normalizedParts = parts.rows.map((row) => {
    const partNum = row.part_num ?? "";
    if (!partNum || seenParts.has(partNum)) throw new Error(`Duplicate or empty part_num in parts.csv.gz: ${partNum}`);
    seenParts.add(partNum);
    const categoryId = parseInteger(row.part_cat_id ?? "", "part_cat_id", "parts.csv.gz");
    const categoryName = categoryById.get(categoryId);
    if (!categoryName) throw new Error(`Part ${partNum} references unknown category ${categoryId}`);
    const colorVariants = (elementsByPart.get(partNum) ?? []).map(({ elementId, colorId }) => {
      const color = colorById.get(colorId)!;
      return {
        elementId,
        colorId,
        colorName: color.name,
        rgb: color.rgb,
        evidenceId: evidenceId("elements.csv.gz", "element_id", elementId),
      };
    }).sort((left, right) => left.elementId.localeCompare(right.elementId));
    return {
      id: `part:${stableSlug(partNum)}`,
      partNum,
      name: row.name ?? "",
      categoryId,
      categoryName,
      material: row.part_material ?? "",
      colorVariants,
      relationshipCount: relationshipCounts.get(partNum) ?? 0,
      evidenceIds: [evidenceId("parts.csv.gz", "part_num", partNum), evidenceId("part_categories.csv.gz", "id", String(categoryId))],
    };
  }).sort((left, right) => left.partNum.localeCompare(right.partNum));

  const sourceLockSha256 = createHash("sha256").update(serializeLock(nextSourceLock)).digest("hex");
  const normalizedCatalog = normalizedCatalogSchema.parse({
    schemaVersion: 1,
    sourcePolicy: SOURCE_POLICY,
    sourceLockSha256,
    sourceLockUpdatedAt: nextSourceLock.updatedAt,
    artifacts: artifacts.map((artifact) => {
      const table = tables.get(artifact.fileName)!;
      return {
        fileName: artifact.fileName,
        sha256: hashBytes(artifact.bytes),
        rowCount: table.rows.length,
        columns: table.headers,
      };
    }),
    parts: normalizedParts,
  });
  return { sourceLock: nextSourceLock, normalizedCatalog, changedArtifacts };
};

export const serializeSourceLock = serializeLock;
