import assortmentJson from "../../data/curated/ff03-test-assortment.json" with { type: "json" };
import ldrawThumbnailIndexJson from "../../data/generated/ldraw-catalog-thumbnails.json" with { type: "json" };
import ldrawFitReviewJson from "../../data/generated/ldraw-fit-review.json" with { type: "json" };
import ldrawDigitalConnectivityJson from "../../data/generated/ldraw-digital-connectivity.json" with { type: "json" };
import modelPackageIndexJson from "../../data/generated/model-packages.json" with { type: "json" };
import {
  catalogPackageSchema,
  type CatalogPackagePart,
  type CatalogRole,
} from "../contracts/catalog-package.js";
import type { TestAssortment } from "../contracts/test-assortment.js";
import type { ModelPackageIndex } from "../contracts/model-package.js";
import type { LDrawFitReviewDocument, LDrawFitReviewEntry } from "../contracts/ldraw-fit-review.js";
import type {
  LDrawDigitalConnectivity,
  LDrawDigitalConnectivityEntry,
} from "../contracts/ldraw-digital-connectivity.js";
import {
  ldrawRuntimePackageSchema,
  type LDrawRuntimeEntry,
} from "../contracts/ldraw-runtime-package.js";

export const catalogAssortment = assortmentJson as TestAssortment;
export const modelPackageIndex = modelPackageIndexJson as ModelPackageIndex;
export const ldrawFitReview = ldrawFitReviewJson as LDrawFitReviewDocument;
export const ldrawDigitalConnectivity = ldrawDigitalConnectivityJson as LDrawDigitalConnectivity;

export type VerifiedLDrawCatalogEntry = {
  componentId: string;
  rebrickablePartNum: string;
  status: "verified";
  ldrawFile: string;
  ldrawUpdate: string;
  modelUrl: string;
  thumbnailUrl: string;
  geometryFallback?: {
    kind: "unprinted-print-parent" | "unprinted-assembly-code";
    parentPartNums: string[];
  } | null;
};

type RuntimeDigitalConnectivityEntry =
  | {
    status: "digitally-supported";
    placementMode: "prototype-family-origin" | "snap-connector";
    placementTransformLdu: number[];
  }
  | {
    status: "blocked";
    placementMode: null;
    placementTransformLdu: null;
  };

type LDrawCatalogEntry = VerifiedLDrawCatalogEntry | {
  componentId: string;
  rebrickablePartNum: string;
  status: "blocked";
  reason: string;
  modelUrl: null;
  thumbnailUrl: null;
};

const ldrawCatalogEntries = ldrawThumbnailIndexJson.entries as LDrawCatalogEntry[];
const ldrawCatalogEntryByComponentId = new Map(
  ldrawCatalogEntries.map((entry) => [entry.componentId, entry]),
);
const ldrawFitReviewByComponentId = new Map(
  ldrawFitReview.entries.map((entry) => [entry.componentId, entry]),
);
const digitalConnectivityByComponentId = new Map<
  string,
  RuntimeDigitalConnectivityEntry | LDrawDigitalConnectivityEntry
>(
  [
    ...ldrawDigitalConnectivity.entries.map((entry) => [entry.componentId, entry] as const),
  ],
);

export type CatalogCategory = "all" | CatalogRole;

export const CATALOG_CATEGORIES: ReadonlyArray<{ id: CatalogCategory }> = [
  { id: "all" },
  { id: "head" },
  { id: "headwear" },
  { id: "torsoAssembly" },
  { id: "legsAssembly" },
  { id: "handAccessory" },
];

const catalogPackageLoaders: Record<CatalogRole, () => Promise<unknown>> = {
  head: () => import("../../data/generated/catalog-packages/head.json"),
  headwear: () => import("../../data/generated/catalog-packages/headwear.json"),
  torsoAssembly: () => import("../../data/generated/catalog-packages/torso-assembly.json"),
  legsAssembly: () => import("../../data/generated/catalog-packages/legs-assembly.json"),
  handAccessory: () => import("../../data/generated/catalog-packages/hand-accessory.json"),
};

const ldrawRuntimePackageLoaders: Record<CatalogRole, () => Promise<unknown>> = {
  head: () => import("../../data/generated/ldraw-runtime/head.json"),
  headwear: () => import("../../data/generated/ldraw-runtime/headwear.json"),
  torsoAssembly: () => import("../../data/generated/ldraw-runtime/torso-assembly.json"),
  legsAssembly: () => import("../../data/generated/ldraw-runtime/legs-assembly.json"),
  handAccessory: () => import("../../data/generated/ldraw-runtime/hand-accessory.json"),
};

const catalogRoles = CATALOG_CATEGORIES.flatMap(({ id }) => id === "all" ? [] : [id]);
const catalogPackageCache = new Map<CatalogRole, Promise<readonly CatalogPackagePart[]>>();
const componentByCatalogKey = new Map(
  catalogAssortment.components.map((component) => [
    `${component.role}:${component.rebrickablePartNum.toLowerCase()}`,
    component,
  ]),
);

const expandedComponentByCatalogKey = new Map<string, CatalogPackagePart>();
const builderComponentById = new Map<string, CatalogPackagePart>();

const catalogKey = (part: Pick<CatalogPackagePart, "role" | "rebrickablePartNum">): string =>
  `${part.role}:${part.rebrickablePartNum.toLowerCase()}`;

export const curatedCatalogParts: CatalogPackagePart[] = catalogAssortment.components.map((component) => ({
  id: component.id,
  role: component.role,
  rebrickablePartNum: component.rebrickablePartNum,
  name: component.name,
  rebrickableCategoryId: component.rebrickableCategoryId,
  rebrickableCategoryName: component.rebrickableCategoryName,
  material: component.material,
  colorNames: [...new Set(component.colorEvidence.map(({ colorName }) => colorName))],
}));

for (const component of curatedCatalogParts) builderComponentById.set(component.id, component);

const hydrateRuntimeEntries = (
  role: CatalogRole,
  parts: readonly CatalogPackagePart[],
  entries: readonly LDrawRuntimeEntry[],
): void => {
  const partByNumber = new Map(parts.map((part) => [part.rebrickablePartNum.toLowerCase(), part]));
  for (const entry of entries) {
    const part = partByNumber.get(entry.rebrickablePartNum.toLowerCase());
    if (!part || part.role !== role) {
      throw new Error(`Runtime LDraw entry has no catalog part: ${entry.componentId}`);
    }
    const component = { ...part, id: entry.componentId } satisfies CatalogPackagePart;
    expandedComponentByCatalogKey.set(catalogKey(component), component);
    builderComponentById.set(component.id, component);
    ldrawCatalogEntryByComponentId.set(component.id, entry);
    digitalConnectivityByComponentId.set(component.id, {
      status: "digitally-supported",
      placementMode: entry.placementMode,
      placementTransformLdu: entry.placementTransformLdu,
    });
    verifiedLDrawThumbnailByComponentId.set(component.id, entry.thumbnailUrl);
  }
};

const loadCatalogRole = (role: CatalogRole): Promise<readonly CatalogPackagePart[]> => {
  const cached = catalogPackageCache.get(role);
  if (cached) return cached;
  const promise = Promise.all([
    catalogPackageLoaders[role](),
    ldrawRuntimePackageLoaders[role](),
  ]).then(([catalogModule, runtimeModule]) => {
    const parsed = catalogPackageSchema.parse((catalogModule as { default: unknown }).default);
    const runtimePackage = ldrawRuntimePackageSchema.parse((runtimeModule as { default: unknown }).default);
    if (parsed.role !== role || runtimePackage.role !== role) {
      throw new Error(`Catalog package role mismatch: ${role}`);
    }
    const partsByKey = new Map(parsed.parts.map((part) => [catalogKey(part), part]));
    for (const part of curatedCatalogParts.filter((entry) => entry.role === role)) {
      partsByKey.set(catalogKey(part), part);
    }
    hydrateRuntimeEntries(role, [...partsByKey.values()], runtimePackage.entries);
    return [...partsByKey.values()].sort((left, right) => {
      const leftBuilderReady = componentByCatalogKey.has(catalogKey(left)) || expandedComponentByCatalogKey.has(catalogKey(left));
      const rightBuilderReady = componentByCatalogKey.has(catalogKey(right)) || expandedComponentByCatalogKey.has(catalogKey(right));
      if (leftBuilderReady !== rightBuilderReady) return leftBuilderReady ? -1 : 1;
      return left.rebrickablePartNum.localeCompare(right.rebrickablePartNum, "en", { numeric: true });
    });
  });
  catalogPackageCache.set(role, promise);
  return promise;
};

export const loadCatalogParts = async (category: CatalogCategory): Promise<readonly CatalogPackagePart[]> => {
  const roles = category === "all" ? catalogRoles : [category];
  return (await Promise.all(roles.map(loadCatalogRole))).flat();
};

export const builderComponentForCatalogPart = (
  part: Pick<CatalogPackagePart, "role" | "rebrickablePartNum">,
): CatalogPackagePart | undefined => {
  const curated = componentByCatalogKey.get(catalogKey(part));
  if (curated) return builderComponentById.get(curated.id);
  return expandedComponentByCatalogKey.get(catalogKey(part));
};

export const builderComponentForId = (componentId: string): CatalogPackagePart | undefined =>
  builderComponentById.get(componentId);

const thumbnailByPartId = new Map(
  modelPackageIndex.thumbnails.map((thumbnail) => [thumbnail.partId, thumbnail.url]),
);
const verifiedLDrawThumbnailByComponentId = new Map(
  ldrawCatalogEntries.flatMap((entry) =>
    entry.status === "verified" && entry.thumbnailUrl
      ? [[entry.componentId, entry.thumbnailUrl] as const]
      : [],
  ),
);

export const ldrawCatalogEntryForComponent = (componentId: string): LDrawCatalogEntry | undefined =>
  ldrawCatalogEntryByComponentId.get(componentId);

export const verifiedLDrawEntryForComponent = (
  componentId: string,
): VerifiedLDrawCatalogEntry | undefined => {
  const entry = ldrawCatalogEntryByComponentId.get(componentId);
  return entry?.status === "verified" ? entry : undefined;
};

export const ldrawFitReviewEntryForComponent = (
  componentId: string,
): LDrawFitReviewEntry | undefined => ldrawFitReviewByComponentId.get(componentId);

export const digitalConnectivityForComponent = (
  componentId: string,
): RuntimeDigitalConnectivityEntry | LDrawDigitalConnectivityEntry | undefined =>
  digitalConnectivityByComponentId.get(componentId);

export const digitallySupportedLDrawEntryForComponent = (
  componentId: string,
): VerifiedLDrawCatalogEntry | undefined => {
  const connectivity = digitalConnectivityByComponentId.get(componentId);
  return connectivity?.status === "digitally-supported"
    ? verifiedLDrawEntryForComponent(componentId)
    : undefined;
};

/**
 * Parts shown by the default builder view: a digitally supported official
 * model with no print-parent geometry fallback. Older curated entries omit
 * geometryFallback entirely, which is equivalent to an exact model.
 */
export const hasExactPrintedGeometry = (componentId: string): boolean => {
  const entry = digitallySupportedLDrawEntryForComponent(componentId);
  return Boolean(entry && (entry.geometryFallback === null || entry.geometryFallback === undefined));
};

export const thumbnailForComponent = (component: Pick<CatalogPackagePart, "id" | "role">): string => {
  const officialLDrawThumbnail = verifiedLDrawThumbnailByComponentId.get(component.id);
  if (officialLDrawThumbnail) {
    return officialLDrawThumbnail;
  }
  const exact = thumbnailByPartId.get(component.id);
  if (exact) {
    return exact;
  }
  if (component.role === "handAccessory") {
    return thumbnailByPartId.get(`${component.id}-left`) ?? "/assets/thumbnails/fixture-torso-assembly.svg";
  }
  if (component.role === "torsoAssembly") {
    return "/assets/thumbnails/fixture-torso-assembly.svg";
  }
  if (component.role === "legsAssembly") {
    return "/assets/thumbnails/fixture-legs-assembly.svg";
  }
  return "/assets/thumbnails/fixture-torso-assembly.svg";
};

export const referenceVariant = catalogAssortment.variants[0];
