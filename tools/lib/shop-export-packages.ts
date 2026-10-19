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
import { verifiedBrickLinkColorId } from "./bricklink-color-map.js";
import { readBrickLinkItemCrosswalk } from "./bricklink-item-crosswalk.js";
import { bricklinkKeywordIds, rebrickableKeywordIds } from "./ldraw-keywords.js";

export const SHOP_EXPORT_DIRECTORY = "data/generated/shop-export";

type NormalizedCatalog = {
  sourcePolicy: string;
  sourceLockSha256: string;
  parts: Array<{
    partNum: string;
    colorVariants: Array<{ elementId: string; colorId: number; colorName: string }>;
    catalogColors: Array<{ colorId: number; colorName: string }>;
  }>;
};

type ExpandedCatalog = {
  sourcePolicy: string;
  entries: Array<{ role: CatalogRole; rebrickablePartNum: string; ldrawFile: string }>;
};

type CuratedAssortment = {
  sourcePolicy: string;
  components: Array<{ role: CatalogRole; rebrickablePartNum: string }>;
};

const readJson = async <T>(root: string, path: string): Promise<T> =>
  JSON.parse(await readFile(resolve(root, path), "utf8")) as T;

const ldrawBaseName = (path: string): string =>
  path.split("/").at(-1)?.replace(/\.(?:dat|ldr)$/iu, "") ?? "";

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

/**
 * A BrickLink ID is accepted only when the same official LDraw file also proves
 * which Rebrickable part it represents (or its filename is that exact part ID).
 */
const bricklinkItemIdFromLDraw = async (
  root: string,
  entry: ExpandedCatalog["entries"][number] | undefined,
  sourceCache: Map<string, Promise<string>>,
): Promise<string | null> => {
  if (!entry) return null;
  let sourcePromise = sourceCache.get(entry.ldrawFile);
  if (!sourcePromise) {
    sourcePromise = readFile(resolve(root, "data/incoming/ldraw-official/extracted/ldraw", entry.ldrawFile), "utf8");
    sourceCache.set(entry.ldrawFile, sourcePromise);
  }
  const lines = (await sourcePromise).split(/\r?\n/u);
  const rebrickableIds = unique(lines.flatMap(rebrickableKeywordIds));
  const provesPart = rebrickableIds.some((id) => id.toLowerCase() === entry.rebrickablePartNum.toLowerCase())
    || ldrawBaseName(entry.ldrawFile).toLowerCase() === entry.rebrickablePartNum.toLowerCase();
  if (!provesPart) return null;
  const bricklinkIds = unique(lines.flatMap(bricklinkKeywordIds));
  return bricklinkIds.length === 1 ? bricklinkIds[0]! : null;
};

/**
 * Builds one shop-export package per builder role from the normalized Rebrickable catalog.
 * Rebrickable colours come from official set inventories. LEGO element IDs are
 * added only when elements.csv.gz records them; nothing is inferred.
 */
export async function buildShopExportPackages(root: string): Promise<Map<string, string>> {
  const [normalized, expanded, curated, bricklinkCrosswalk] = await Promise.all([
    readJson<NormalizedCatalog>(root, "data/generated/catalog-normalized.json"),
    readJson<ExpandedCatalog>(root, "data/generated/ldraw-expanded-catalog.json"),
    readJson<CuratedAssortment>(root, "data/curated/ff03-test-assortment.json"),
    readBrickLinkItemCrosswalk(root),
  ]);
  for (const source of [normalized, expanded, curated]) {
    if (source.sourcePolicy !== SHOP_EXPORT_SOURCE_POLICY) throw new Error("Shop export source policy mismatch");
  }
  if (bricklinkCrosswalk.catalogSourceLockSha256 !== normalized.sourceLockSha256) {
    throw new Error("BrickLink item crosswalk uses a stale catalog lock");
  }

  const partByNumber = new Map(normalized.parts.map((part) => [part.partNum.toLowerCase(), part]));
  const bricklinkItemIdByPart = new Map(bricklinkCrosswalk.entries.map((entry) => [
    entry.rebrickablePartNum.toLowerCase(),
    entry.bricklinkItemId,
  ]));
  const expandedByRoleAndPart = new Map(expanded.entries.map((entry) => [
    `${entry.role}:${entry.rebrickablePartNum.toLowerCase()}`,
    entry,
  ]));
  const ldrawSourceCache = new Map<string, Promise<string>>();
  const partNumsByRole = new Map<CatalogRole, Set<string>>();
  for (const { role, rebrickablePartNum } of [...expanded.entries, ...curated.components]) {
    const values = partNumsByRole.get(role) ?? new Set<string>();
    values.add(rebrickablePartNum);
    partNumsByRole.set(role, values);
  }

  const files = new Map<string, string>();
  const manifestPackages = [];
  for (const [role, fileName] of Object.entries(runtimeFileByRole) as Array<[CatalogRole, string]>) {
    const entries: ShopExportEntry[] = [];
    for (const rebrickablePartNum of [...(partNumsByRole.get(role) ?? [])]
      .sort((left, right) => left.localeCompare(right, "en"))) {
        const part = partByNumber.get(rebrickablePartNum.toLowerCase());
        if (!part) throw new Error(`Builder part is missing from the normalized catalog: ${rebrickablePartNum}`);
        const colors = new Map<number, {
          rebrickableColorId: number;
          colorName: string;
          elementIds: string[];
          bricklinkColorId: number | null;
        }>();
        for (const catalogColor of part.catalogColors) {
          if (catalogColor.colorId === REBRICKABLE_NO_COLOR_ID) continue;
          colors.set(catalogColor.colorId, {
            rebrickableColorId: catalogColor.colorId,
            colorName: catalogColor.colorName,
            elementIds: [],
            bricklinkColorId: verifiedBrickLinkColorId(catalogColor.colorId, catalogColor.colorName),
          });
        }
        for (const variant of part.colorVariants) {
          if (variant.colorId === REBRICKABLE_NO_COLOR_ID) continue;
          const color = colors.get(variant.colorId)
            ?? {
              rebrickableColorId: variant.colorId,
              colorName: variant.colorName,
              elementIds: [],
              bricklinkColorId: verifiedBrickLinkColorId(variant.colorId, variant.colorName),
            };
          color.elementIds.push(variant.elementId);
          colors.set(variant.colorId, color);
        }
        const ldrawBricklinkItemId = await bricklinkItemIdFromLDraw(
          root,
          expandedByRoleAndPart.get(`${role}:${rebrickablePartNum.toLowerCase()}`),
          ldrawSourceCache,
        );
        entries.push({
          rebrickablePartNum,
          bricklinkItemId: ldrawBricklinkItemId
            ?? bricklinkItemIdByPart.get(rebrickablePartNum.toLowerCase())
            ?? null,
          colors: [...colors.values()]
            .map((color) => ({ ...color, elementIds: color.elementIds.sort() }))
            .sort((left, right) => left.rebrickableColorId - right.rebrickableColorId),
        });
    }
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
