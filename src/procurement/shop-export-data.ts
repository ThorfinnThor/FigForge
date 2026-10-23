import { loadCorePackage } from "../catalog/core-package-data.js";
import type { CatalogRole } from "../contracts/catalog-package.js";
import { shopExportPackageSchema, type ShopExportEntry } from "../contracts/shop-export.js";
import type { ShopExportLookup } from "./shop-export.js";

const shopExportLoaders: Record<CatalogRole, () => Promise<unknown>> = {
  head: () => import("../../data/generated/shop-export/head.json"),
  headwear: () => import("../../data/generated/shop-export/headwear.json"),
  torsoAssembly: () => import("../../data/generated/shop-export/torso-assembly.json"),
  legsAssembly: () => import("../../data/generated/shop-export/legs-assembly.json"),
  handAccessory: () => import("../../data/generated/shop-export/hand-accessory.json"),
};

const cache = new Map<CatalogRole, Promise<ReadonlyMap<string, ShopExportEntry>>>();

const loadRole = (role: CatalogRole): Promise<ReadonlyMap<string, ShopExportEntry>> => {
  const cached = cache.get(role);
  if (cached) return cached;
  const promise = shopExportLoaders[role]().then((module) => {
    const parsed = shopExportPackageSchema.parse((module as { default: unknown }).default);
    if (parsed.role !== role) throw new Error(`Shop export package role mismatch: ${role}`);
    return new Map(parsed.entries.map((entry) => [entry.rebrickablePartNum.toLowerCase(), entry]));
  });
  promise.catch(() => cache.delete(role));
  cache.set(role, promise);
  return promise;
};

/** Loads only the export packages for the roles that are part of the figure. */
export const loadShopExportLookup = async (roles: Iterable<CatalogRole>): Promise<ShopExportLookup> => {
  const uniqueRoles = [...new Set(roles)];
  const packages = new Map(await Promise.all(uniqueRoles.map(async (role) => [role, await loadRole(role)] as const)));
  return (slot, rebrickablePartNum) => packages.get(slot)?.get(rebrickablePartNum.toLowerCase());
};

/**
 * Like `loadShopExportLookup`, but answers from the small core packages when they already
 * cover every requested part, and only then avoids downloading the full role packages.
 */
export const loadShopExportLookupForParts = async (
  parts: ReadonlyArray<{ slot: CatalogRole; rebrickablePartNum: string }>,
): Promise<ShopExportLookup> => {
  const roles = [...new Set(parts.map(({ slot }) => slot))];
  const cores = new Map(await Promise.all(roles.map(async (role) => [role, await loadCorePackage(role)] as const)));
  const coveredByCore = parts.every(({ slot, rebrickablePartNum }) => cores.get(slot)?.catalog.parts
    .some((part) => part.rebrickablePartNum.toLowerCase() === rebrickablePartNum.toLowerCase()));
  if (!coveredByCore) return loadShopExportLookup(roles);
  const entries = new Map(roles.map((role) => [
    role,
    new Map((cores.get(role)?.shopExport.entries ?? []).map((entry) => [entry.rebrickablePartNum.toLowerCase(), entry])),
  ]));
  return (slot, rebrickablePartNum) => entries.get(slot)?.get(rebrickablePartNum.toLowerCase());
};

/** Every exportable catalog part of every role; used to map imported BrickLink lists once. */
export const loadAllShopExportEntries = async (): Promise<ShopExportEntry[]> => {
  const roles = Object.keys(shopExportLoaders) as CatalogRole[];
  const packages = await Promise.all(roles.map(loadRole));
  return packages.flatMap((entries) => [...entries.values()]);
};
