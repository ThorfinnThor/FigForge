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
