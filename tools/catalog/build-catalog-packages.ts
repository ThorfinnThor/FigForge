import type { NormalizedCatalog } from "../../src/contracts/catalog-refresh.js";
import {
  catalogPackageManifestSchema,
  catalogPackageSchema,
  type CatalogPackage,
  type CatalogPackageManifest,
  type CatalogPackagePart,
  type CatalogRole,
} from "../../src/contracts/catalog-package.js";

const SOURCE_POLICY = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;

export const CATALOG_CATEGORY_IDS_BY_ROLE = {
  head: [59],
  headwear: [65, 72],
  torsoAssembly: [60],
  legsAssembly: [61],
  handAccessory: [27, 73],
} as const satisfies Record<CatalogRole, readonly number[]>;

export const CATALOG_PACKAGE_FILE_BY_ROLE = {
  head: "head.json",
  headwear: "headwear.json",
  torsoAssembly: "torso-assembly.json",
  legsAssembly: "legs-assembly.json",
  handAccessory: "hand-accessory.json",
} as const satisfies Record<CatalogRole, string>;

const roles = Object.keys(CATALOG_CATEGORY_IDS_BY_ROLE) as CatalogRole[];

export type BuiltCatalogPackages = {
  manifest: CatalogPackageManifest;
  packages: Record<CatalogRole, CatalogPackage>;
};

export function buildCatalogPackages(catalog: NormalizedCatalog): BuiltCatalogPackages {
  const roleByCategoryId = new Map<number, CatalogRole>();
  for (const role of roles) {
    for (const categoryId of CATALOG_CATEGORY_IDS_BY_ROLE[role]) {
      roleByCategoryId.set(categoryId, role);
    }
  }

  const partsByRole: Record<CatalogRole, CatalogPackagePart[]> = {
    head: [],
    headwear: [],
    torsoAssembly: [],
    legsAssembly: [],
    handAccessory: [],
  };

  for (const part of catalog.parts) {
    const role = roleByCategoryId.get(part.categoryId);
    if (!role) continue;
    partsByRole[role].push({
      id: part.id,
      role,
      rebrickablePartNum: part.partNum,
      name: part.name,
      rebrickableCategoryId: part.categoryId,
      rebrickableCategoryName: part.categoryName,
      material: part.material,
      colorNames: [...new Set(part.colorVariants.map(({ colorName }) => colorName))].sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
    });
  }

  const packages = Object.fromEntries(roles.map((role) => {
    const catalogPackage = catalogPackageSchema.parse({
      schemaVersion: 1,
      sourcePolicy: SOURCE_POLICY,
      sourceLockSha256: catalog.sourceLockSha256,
      role,
      categoryIds: [...CATALOG_CATEGORY_IDS_BY_ROLE[role]],
      parts: partsByRole[role],
    });
    return [role, catalogPackage];
  })) as Record<CatalogRole, CatalogPackage>;

  const manifest = catalogPackageManifestSchema.parse({
    schemaVersion: 1,
    sourcePolicy: SOURCE_POLICY,
    sourceLockSha256: catalog.sourceLockSha256,
    includedPartCount: roles.reduce((count, role) => count + packages[role].parts.length, 0),
    packages: roles.map((role) => ({
      role,
      fileName: CATALOG_PACKAGE_FILE_BY_ROLE[role],
      categoryIds: [...CATALOG_CATEGORY_IDS_BY_ROLE[role]],
      partCount: packages[role].parts.length,
    })),
  });

  return { manifest, packages };
}
