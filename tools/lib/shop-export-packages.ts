import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CatalogRole } from "../../src/contracts/catalog-package.js";
import {
  REBRICKABLE_NO_COLOR_ID,
  SHOP_EXPORT_SOURCE_POLICY,
  shopExportPackageSchema,
  type ShopExportEntry,
} from "../../src/contracts/shop-export.js";
import { runtimeFileByRole } from "./ldraw-runtime-packages.js";

export const SHOP_EXPORT_DIRECTORY = "data/generated/shop-export";

type NormalizedCatalog = {
  sourcePolicy: string;
  sourceLockSha256: string;
  parts: Array<{
    partNum: string;
    colorVariants: Array<{ elementId: string; colorId: number; colorName: string }>;
  }>;
};

type ExpandedCatalog = {
  sourcePolicy: string;
  entries: Array<{ role: CatalogRole; rebrickablePartNum: string }>;
};

type CuratedAssortment = {
  sourcePolicy: string;
  components: Array<{ role: CatalogRole; rebrickablePartNum: string }>;
};

const readJson = async <T>(root: string, path: string): Promise<T> =>
  JSON.parse(await readFile(resolve(root, path), "utf8")) as T;

/**
 * Builds one shop-export package per builder role from the normalized Rebrickable catalog.
 * Only colours and LEGO element IDs recorded in elements.csv.gz are carried over; nothing is inferred.
 */
export async function buildShopExportPackages(root: string): Promise<Map<string, string>> {
  const [normalized, expanded, curated] = await Promise.all([
    readJson<NormalizedCatalog>(root, "data/generated/catalog-normalized.json"),
    readJson<ExpandedCatalog>(root, "data/generated/ldraw-expanded-catalog.json"),
    readJson<CuratedAssortment>(root, "data/curated/ff03-test-assortment.json"),
  ]);
  for (const source of [normalized, expanded, curated]) {
    if (source.sourcePolicy !== SHOP_EXPORT_SOURCE_POLICY) throw new Error("Shop export source policy mismatch");
  }

  const partByNumber = new Map(normalized.parts.map((part) => [part.partNum.toLowerCase(), part]));
  const partNumsByRole = new Map<CatalogRole, Set<string>>();
  for (const { role, rebrickablePartNum } of [...expanded.entries, ...curated.components]) {
    const values = partNumsByRole.get(role) ?? new Set<string>();
    values.add(rebrickablePartNum);
    partNumsByRole.set(role, values);
  }

  const files = new Map<string, string>();
  const manifestPackages = [];
  for (const [role, fileName] of Object.entries(runtimeFileByRole) as Array<[CatalogRole, string]>) {
    const entries = [...(partNumsByRole.get(role) ?? [])]
      .sort((left, right) => left.localeCompare(right, "en"))
      .map<ShopExportEntry>((rebrickablePartNum) => {
        const part = partByNumber.get(rebrickablePartNum.toLowerCase());
        if (!part) throw new Error(`Builder part is missing from the normalized catalog: ${rebrickablePartNum}`);
        const colors = new Map<number, { rebrickableColorId: number; colorName: string; elementIds: string[] }>();
        for (const variant of part.colorVariants) {
          if (variant.colorId === REBRICKABLE_NO_COLOR_ID) continue;
          const color = colors.get(variant.colorId)
            ?? { rebrickableColorId: variant.colorId, colorName: variant.colorName, elementIds: [] };
          color.elementIds.push(variant.elementId);
          colors.set(variant.colorId, color);
        }
        return {
          rebrickablePartNum,
          colors: [...colors.values()]
            .map((color) => ({ ...color, elementIds: color.elementIds.sort() }))
            .sort((left, right) => left.rebrickableColorId - right.rebrickableColorId),
        };
      });
    const exportPackage = shopExportPackageSchema.parse({
      schemaVersion: 1,
      sourcePolicy: SHOP_EXPORT_SOURCE_POLICY,
      catalogSourceLockSha256: normalized.sourceLockSha256,
      role,
      entryCount: entries.length,
      entries,
    });
    files.set(fileName, `${JSON.stringify(exportPackage)}\n`);
    manifestPackages.push({ role, fileName, entryCount: entries.length });
  }
  files.set("manifest.json", `${JSON.stringify({
    schemaVersion: 1,
    sourcePolicy: SHOP_EXPORT_SOURCE_POLICY,
    catalogSourceLockSha256: normalized.sourceLockSha256,
    packages: manifestPackages,
  })}\n`);
  return files;
}

export async function writeShopExportPackages(root: string): Promise<{ files: string[] }> {
  const files = await buildShopExportPackages(root);
  const directory = resolve(root, SHOP_EXPORT_DIRECTORY);
  await rm(directory, { force: true, recursive: true });
  await mkdir(directory, { recursive: true });
  for (const [fileName, content] of files) {
    await writeFile(resolve(directory, fileName), content, "utf8");
  }
  return { files: [...files.keys()] };
}
