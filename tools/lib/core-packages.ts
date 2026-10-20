import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pinnedCatalogKeys, selectCorePartNums } from "../../src/catalog/core-selection.js";
import {
  catalogPackageSchema,
  type CatalogRole,
} from "../../src/contracts/catalog-package.js";
import { corePackageSchema, type CorePackage } from "../../src/contracts/core-package.js";
import { ldrawRuntimePackageSchema } from "../../src/contracts/ldraw-runtime-package.js";
import { shopExportPackageSchema } from "../../src/contracts/shop-export.js";
import { defaultFigureDocument } from "../../src/figure/default-figure.js";
import { FIGURE_TEMPLATES } from "../../src/ideas/figure-templates.js";
import { CATALOG_PACKAGE_FILE_BY_ROLE } from "../catalog/build-catalog-packages.js";

const SOURCE_POLICY = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;

export const CORE_PACKAGE_DIRECTORY = "data/generated/core-packages";
/** Popular non-starter parts per role; a few screens of the list at 80 parts per batch. */
export const CORE_POPULAR_COUNT = 300;

const roles = Object.keys(CATALOG_PACKAGE_FILE_BY_ROLE) as CatalogRole[];

const readJson = async (root: string, path: string): Promise<unknown> =>
  JSON.parse(await readFile(resolve(root, path), "utf8")) as unknown;

/** Derives every role's core package from the full generated packages. Pure given the files. */
export async function buildCorePackages(root: string): Promise<Record<CatalogRole, CorePackage>> {
  const pinnedKeys = pinnedCatalogKeys([
    ...FIGURE_TEMPLATES.map(({ document }) => document),
    defaultFigureDocument("default"),
  ]);
  const entries = await Promise.all(roles.map(async (role) => {
    const file = CATALOG_PACKAGE_FILE_BY_ROLE[role];
    const catalog = catalogPackageSchema.parse(await readJson(root, `data/generated/catalog-packages/${file}`));
    const runtime = ldrawRuntimePackageSchema.parse(await readJson(root, `data/generated/ldraw-runtime/${file}`));
    const shopExport = shopExportPackageSchema.parse(await readJson(root, `data/generated/shop-export/${file}`));

    const partNums = selectCorePartNums({
      role,
      parts: catalog.parts,
      runtimePartNums: new Set(runtime.entries.map(({ rebrickablePartNum }) => rebrickablePartNum.toLowerCase())),
      pinnedKeys,
      popularCount: CORE_POPULAR_COUNT,
    });
    for (const key of pinnedKeys) {
      const [pinnedRole, partNum] = key.split(":");
      if (pinnedRole === role && !partNums.has(partNum ?? "")) {
        throw new Error(`Starter figure part ${key} is not builder-ready in the full ${role} package`);
      }
    }
    const keep = (partNum: string): boolean => partNums.has(partNum.toLowerCase());
    const runtimeEntries = runtime.entries.filter(({ rebrickablePartNum }) => keep(rebrickablePartNum));
    const shopEntries = shopExport.entries.filter(({ rebrickablePartNum }) => keep(rebrickablePartNum));
    return [role, corePackageSchema.parse({
      schemaVersion: 1,
      sourcePolicy: SOURCE_POLICY,
      role,
      popularCount: CORE_POPULAR_COUNT,
      catalog: { ...catalog, parts: catalog.parts.filter(({ rebrickablePartNum }) => keep(rebrickablePartNum)) },
      runtime: { ...runtime, entryCount: runtimeEntries.length, entries: runtimeEntries },
      shopExport: { ...shopExport, entryCount: shopEntries.length, entries: shopEntries },
    })] as const;
  }));
  return Object.fromEntries(entries) as Record<CatalogRole, CorePackage>;
}

export async function writeCorePackages(root: string): Promise<{ roles: Array<{ role: CatalogRole; partCount: number }> }> {
  const packages = await buildCorePackages(root);
  const directory = resolve(root, CORE_PACKAGE_DIRECTORY);
  await mkdir(directory, { recursive: true });
  for (const role of roles) {
    await writeFile(resolve(directory, CATALOG_PACKAGE_FILE_BY_ROLE[role]), `${JSON.stringify(packages[role])}\n`, "utf8");
  }
  return { roles: roles.map((role) => ({ role, partCount: packages[role].catalog.parts.length })) };
}
