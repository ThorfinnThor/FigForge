import type { CatalogRole } from "../contracts/catalog-package.js";
import { corePackageSchema, type CorePackage } from "../contracts/core-package.js";

const corePackageLoaders: Record<CatalogRole, () => Promise<unknown>> = {
  head: () => import("../../data/generated/core-packages/head.json"),
  headwear: () => import("../../data/generated/core-packages/headwear.json"),
  torsoAssembly: () => import("../../data/generated/core-packages/torso-assembly.json"),
  legsAssembly: () => import("../../data/generated/core-packages/legs-assembly.json"),
  handAccessory: () => import("../../data/generated/core-packages/hand-accessory.json"),
};

const cache = new Map<CatalogRole, Promise<CorePackage>>();

/** Loads the small first-load slice of a role: starter-figure parts plus the most popular ones. */
export const loadCorePackage = (role: CatalogRole): Promise<CorePackage> => {
  const cached = cache.get(role);
  if (cached) return cached;
  const promise = corePackageLoaders[role]().then((module) => {
    const parsed = corePackageSchema.parse((module as { default: unknown }).default);
    if (parsed.role !== role) throw new Error(`Core package role mismatch: ${role}`);
    return parsed;
  });
  promise.catch(() => cache.delete(role));
  cache.set(role, promise);
  return promise;
};
