import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CatalogRole } from "../../src/contracts/catalog-package.js";

export const AMBIGUOUS_MAPPING_SOURCE_POLICY = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;

export type AmbiguousMappingSelection = {
  role: CatalogRole;
  rebrickablePartNum: string;
  selectedFile: string;
  catalogName: string;
  officialDescription: string;
  reason: string;
};

export type AmbiguousMappingBlock = {
  role: CatalogRole;
  rebrickablePartNum: string;
  catalogName: string;
  reason: string;
};

export type AmbiguousMappingAssembly = {
  role: "legsAssembly";
  rebrickablePartNum: string;
  catalogName: string;
  componentFiles: string[];
  reason: string;
};

export type AmbiguousMappingResolutions = {
  schemaVersion: 1;
  sourcePolicy: typeof AMBIGUOUS_MAPPING_SOURCE_POLICY;
  methodology: string;
  selections: AmbiguousMappingSelection[];
  assemblies: AmbiguousMappingAssembly[];
  blocked: AmbiguousMappingBlock[];
};

export const ambiguousMappingKey = (role: CatalogRole, partNum: string): string =>
  `${role}:${partNum.trim().toLowerCase()}`;

export async function readAmbiguousMappingResolutions(root: string): Promise<AmbiguousMappingResolutions> {
  const path = resolve(root, "data/curated/ldraw-ambiguous-mapping-resolutions.json");
  const parsed = JSON.parse(await readFile(path, "utf8")) as AmbiguousMappingResolutions;
  if (parsed.schemaVersion !== 1 || parsed.sourcePolicy !== AMBIGUOUS_MAPPING_SOURCE_POLICY) {
    throw new Error("Invalid ambiguous LDraw mapping resolution policy");
  }
  return parsed;
}

export const selectedAmbiguousMappings = (
  resolutions: AmbiguousMappingResolutions,
): Map<string, AmbiguousMappingSelection> =>
  new Map(resolutions.selections.map((entry) => [ambiguousMappingKey(entry.role, entry.rebrickablePartNum), entry]));
