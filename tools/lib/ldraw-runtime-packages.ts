import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CatalogRole } from "../../src/contracts/catalog-package.js";
import { buildCatalogSearchText } from "../../src/search/catalog-search-document.js";

const SOURCE_POLICY = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;

export const runtimeFileByRole = {
  head: "head.json",
  headwear: "headwear.json",
  torsoAssembly: "torso-assembly.json",
  legsAssembly: "legs-assembly.json",
  handAccessory: "hand-accessory.json",
} as const satisfies Record<CatalogRole, string>;

type ExpandedRuntimeSourceEntry = {
  componentId: string;
  role: CatalogRole;
  rebrickablePartNum: string;
  name: string;
  rebrickableCategoryName: string;
  colorNames: string[];
  status: "verified";
  ldrawFile: string;
  ldrawUpdate: string;
  modelUrl: string;
  thumbnailUrl: string;
  geometryFallback: null | {
    kind: "unprinted-print-parent" | "unprinted-assembly-code";
    parentPartNums: string[];
  };
  placementMode: "prototype-family-origin" | "snap-connector";
  placementTransformLdu: number[];
};

type ExpandedRuntimeSource = {
  sourcePolicy: string;
  entries: ExpandedRuntimeSourceEntry[];
};

const sha256 = (content: string): string => createHash("sha256").update(content).digest("hex");

export async function writeLDrawRuntimePackages(root: string): Promise<{
  catalogEntriesSha256: string;
  totalEntryCount: number;
  packages: Array<{ role: CatalogRole; fileName: string; entryCount: number }>;
}> {
  const catalog = JSON.parse(
    await readFile(resolve(root, "data/generated/ldraw-expanded-catalog.json"), "utf8"),
  ) as ExpandedRuntimeSource;
  if (catalog.sourcePolicy !== SOURCE_POLICY) throw new Error("Expanded catalog source policy mismatch");

  const catalogEntriesSha256 = sha256(JSON.stringify(catalog.entries));
  const ldrawRoot = resolve(root, "data/incoming/ldraw-official/extracted/ldraw");
  const descriptionCache = new Map<string, string>();
  const ldrawDescriptionFor = async (file: string): Promise<string> => {
    const cached = descriptionCache.get(file);
    if (cached !== undefined) return cached;
    const source = await readFile(resolve(ldrawRoot, file), "utf8");
    const firstLine = source.split(/\r?\n/u).find((line) => /^0\s+(?!Name:|Author:|!)/u.test(line)) ?? "";
    const description = firstLine.replace(/^0\s+/u, "").trim().slice(0, 320);
    descriptionCache.set(file, description);
    return description;
  };
  const runtimeDirectory = resolve(root, "data/generated/ldraw-runtime");
  await rm(runtimeDirectory, { force: true, recursive: true });
  await mkdir(runtimeDirectory, { recursive: true });
  const packages = [];

  for (const [role, fileName] of Object.entries(runtimeFileByRole) as Array<[CatalogRole, string]>) {
    const entries = [];
    for (const entry of catalog.entries.filter((candidate) => candidate.role === role)) {
      entries.push({
        componentId: entry.componentId,
        rebrickablePartNum: entry.rebrickablePartNum,
        status: entry.status,
        ldrawFile: entry.ldrawFile,
        ldrawUpdate: entry.ldrawUpdate,
        modelUrl: entry.modelUrl,
        thumbnailUrl: entry.thumbnailUrl,
        searchText: buildCatalogSearchText(entry, await ldrawDescriptionFor(entry.ldrawFile)),
        geometryFallback: entry.geometryFallback,
        placementMode: entry.placementMode,
        placementTransformLdu: entry.placementTransformLdu,
      });
    }
    await writeFile(resolve(runtimeDirectory, fileName), `${JSON.stringify({
      schemaVersion: 2,
      sourcePolicy: SOURCE_POLICY,
      catalogEntriesSha256,
      role,
      entryCount: entries.length,
      entries,
    })}\n`, "utf8");
    packages.push({ role, fileName, entryCount: entries.length });
  }

  const manifest = {
    schemaVersion: 2,
    sourcePolicy: SOURCE_POLICY,
    catalogEntriesSha256,
    totalEntryCount: catalog.entries.length,
    packages,
  };
  await writeFile(resolve(runtimeDirectory, "manifest.json"), `${JSON.stringify(manifest)}\n`, "utf8");
  return manifest;
}
