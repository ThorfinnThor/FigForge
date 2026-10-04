import { gunzipSync } from "node:zlib";
import {
  catalogSetIndexSchema,
  CATALOG_SET_INDEX_SOURCE_POLICY,
  type CatalogSetIndex,
} from "../../src/contracts/catalog-set-index.js";
import { parseCsv, requireColumns, visitCsvRows } from "../../src/catalog/csv.js";
import type { CatalogArtifactBytes } from "./normalize-catalog.js";

const SET_INDEX_FILES = [
  "sets.csv.gz",
  "inventories.csv.gz",
  "inventory_parts.csv.gz",
  "inventory_minifigs.csv.gz",
  "minifigs.csv.gz",
] as const;

type SetIndexFileName = (typeof SET_INDEX_FILES)[number];

export type CatalogSetIndexArtifact = {
  fileName: SetIndexFileName;
  rowCount: number;
  columns: string[];
};

export type BuiltCatalogSetIndex = {
  index: CatalogSetIndex;
  artifacts: CatalogSetIndexArtifact[];
};

const compareText = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;

const decodeCsv = (bytes: Uint8Array): string => {
  const decoded = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
    ? gunzipSync(bytes)
    : bytes;
  return new TextDecoder("utf-8", { fatal: true }).decode(decoded);
};

const parseInteger = (value: string, field: string, fileName: string): number => {
  if (!/^\d+$/u.test(value)) throw new Error(`CSV ${fileName} has an invalid integer in ${field}: ${value}`);
  return Number(value);
};

export const buildCatalogSetIndex = ({
  artifacts,
  relevantPartNums,
  sourceLockSha256,
}: {
  artifacts: readonly CatalogArtifactBytes[];
  relevantPartNums: ReadonlySet<string>;
  sourceLockSha256: string;
}): BuiltCatalogSetIndex => {
  const artifactByName = new Map(artifacts.map((artifact) => [artifact.fileName, artifact.bytes]));
  for (const fileName of SET_INDEX_FILES) {
    if (!artifactByName.has(fileName)) throw new Error(`Required set-index artifact is missing: ${fileName}`);
  }
  const text = (fileName: SetIndexFileName): string => {
    const bytes = artifactByName.get(fileName);
    if (!bytes) throw new Error(`Required set-index artifact is missing: ${fileName}`);
    return decodeCsv(bytes);
  };

  const artifactResults: CatalogSetIndexArtifact[] = [];
  const setsTable = parseCsv(text("sets.csv.gz"), "sets.csv.gz");
  requireColumns(setsTable, "sets.csv.gz", ["set_num", "name", "year"]);
  artifactResults.push({ fileName: "sets.csv.gz", rowCount: setsTable.rows.length, columns: setsTable.headers });
  const setsByNum = new Map<string, { name: string; year: number }>();
  for (const row of setsTable.rows) {
    const setNum = row.set_num ?? "";
    const name = row.name ?? "";
    if (!setNum || !name || setsByNum.has(setNum)) throw new Error(`Duplicate or empty set in sets.csv.gz: ${setNum}`);
    setsByNum.set(setNum, { name, year: parseInteger(row.year ?? "", "year", "sets.csv.gz") });
  }

  const minifigsTable = parseCsv(text("minifigs.csv.gz"), "minifigs.csv.gz");
  requireColumns(minifigsTable, "minifigs.csv.gz", ["fig_num", "name"]);
  artifactResults.push({ fileName: "minifigs.csv.gz", rowCount: minifigsTable.rows.length, columns: minifigsTable.headers });
  const figureNums = new Set<string>();
  for (const row of minifigsTable.rows) {
    const figureNum = row.fig_num ?? "";
    if (!figureNum || figureNums.has(figureNum)) throw new Error(`Duplicate or empty fig_num in minifigs.csv.gz: ${figureNum}`);
    figureNums.add(figureNum);
  }

  const inventoriesTable = parseCsv(text("inventories.csv.gz"), "inventories.csv.gz");
  requireColumns(inventoriesTable, "inventories.csv.gz", ["id", "set_num"]);
  artifactResults.push({ fileName: "inventories.csv.gz", rowCount: inventoriesTable.rows.length, columns: inventoriesTable.headers });
  const inventorySetNumById = new Map<string, string>();
  const directSetNumByInventoryId = new Map<string, string>();
  const figureNumByInventoryId = new Map<string, string>();
  for (const row of inventoriesTable.rows) {
    const inventoryId = row.id ?? "";
    const setNum = row.set_num ?? "";
    if (!inventoryId || !setNum || inventorySetNumById.has(inventoryId)) {
      throw new Error(`Duplicate or empty inventory in inventories.csv.gz: ${inventoryId}`);
    }
    inventorySetNumById.set(inventoryId, setNum);
    if (setsByNum.has(setNum)) directSetNumByInventoryId.set(inventoryId, setNum);
    if (figureNums.has(setNum)) figureNumByInventoryId.set(inventoryId, setNum);
  }

  const inventoryMinifigsTable = parseCsv(text("inventory_minifigs.csv.gz"), "inventory_minifigs.csv.gz");
  requireColumns(inventoryMinifigsTable, "inventory_minifigs.csv.gz", ["inventory_id", "fig_num"]);
  artifactResults.push({
    fileName: "inventory_minifigs.csv.gz",
    rowCount: inventoryMinifigsTable.rows.length,
    columns: inventoryMinifigsTable.headers,
  });
  const setNumsByFigureNum = new Map<string, Set<string>>();
  for (const row of inventoryMinifigsTable.rows) {
    const inventoryId = row.inventory_id ?? "";
    const figureNum = row.fig_num ?? "";
    if (!inventorySetNumById.has(inventoryId)) {
      throw new Error(`inventory_minifigs.csv.gz references unknown inventory ${inventoryId}`);
    }
    if (!figureNums.has(figureNum)) {
      throw new Error(`inventory_minifigs.csv.gz references unknown minifigure ${figureNum}`);
    }
    const setNum = directSetNumByInventoryId.get(inventoryId);
    if (!setNum) continue;
    const setNums = setNumsByFigureNum.get(figureNum) ?? new Set<string>();
    setNums.add(setNum);
    setNumsByFigureNum.set(figureNum, setNums);
  }

  const partNumsBySetNum = new Map<string, Set<string>>();
  const addAssociation = (setNum: string, partNum: string): void => {
    if (!relevantPartNums.has(partNum)) return;
    const partNums = partNumsBySetNum.get(setNum) ?? new Set<string>();
    partNums.add(partNum);
    partNumsBySetNum.set(setNum, partNums);
  };
  const inventoryPartsVisit = visitCsvRows(
    text("inventory_parts.csv.gz"),
    "inventory_parts.csv.gz",
    (row) => {
      const inventoryId = row.inventory_id ?? "";
      const partNum = row.part_num ?? "";
      const directSetNum = directSetNumByInventoryId.get(inventoryId);
      if (directSetNum) addAssociation(directSetNum, partNum);
      const figureNum = figureNumByInventoryId.get(inventoryId);
      if (!figureNum) return;
      for (const setNum of setNumsByFigureNum.get(figureNum) ?? []) addAssociation(setNum, partNum);
    },
  );
  requireColumns(
    { headers: inventoryPartsVisit.headers, rows: [] },
    "inventory_parts.csv.gz",
    ["inventory_id", "part_num"],
  );
  artifactResults.push({
    fileName: "inventory_parts.csv.gz",
    rowCount: inventoryPartsVisit.rowCount,
    columns: inventoryPartsVisit.headers,
  });

  const parts = [...relevantPartNums].sort(compareText);
  const partIndexByNum = new Map(parts.map((partNum, index) => [partNum, index]));
  const sets = [...partNumsBySetNum.entries()]
    .map(([setNum, partNums]) => {
      const metadata = setsByNum.get(setNum);
      if (!metadata) throw new Error(`Set association references unknown set ${setNum}`);
      return {
        setNum,
        name: metadata.name,
        year: metadata.year,
        partIndexes: [...partNums]
          .map((partNum) => partIndexByNum.get(partNum)!)
          .sort((left, right) => left - right),
      };
    })
    .sort((left, right) => compareText(left.setNum, right.setNum));
  const mappedPartIndexes = new Set(sets.flatMap(({ partIndexes }) => partIndexes));
  const associationCount = sets.reduce((count, set) => count + set.partIndexes.length, 0);

  return {
    index: catalogSetIndexSchema.parse({
      schemaVersion: 1,
      sourcePolicy: CATALOG_SET_INDEX_SOURCE_POLICY,
      sourceLockSha256,
      parts,
      sets,
      summary: {
        relevantPartCount: parts.length,
        mappedPartCount: mappedPartIndexes.size,
        unmappedPartCount: parts.length - mappedPartIndexes.size,
        setCount: sets.length,
        associationCount,
      },
    }),
    artifacts: artifactResults.sort((left, right) => compareText(left.fileName, right.fileName)),
  };
};
