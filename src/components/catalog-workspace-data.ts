import assortmentJson from "../../data/curated/ff03-test-assortment.json" with { type: "json" };
import ldrawThumbnailIndexJson from "../../data/generated/ldraw-catalog-thumbnails.json" with { type: "json" };
import ldrawFitReviewJson from "../../data/generated/ldraw-fit-review.json" with { type: "json" };
import ldrawDigitalConnectivityJson from "../../data/generated/ldraw-digital-connectivity.json" with { type: "json" };
import modelPackageIndexJson from "../../data/generated/model-packages.json" with { type: "json" };
import type { AssortmentComponent, TestAssortment } from "../contracts/test-assortment.js";
import type { ModelPackageIndex } from "../contracts/model-package.js";
import type { LDrawFitReviewDocument, LDrawFitReviewEntry } from "../contracts/ldraw-fit-review.js";
import type {
  LDrawDigitalConnectivity,
  LDrawDigitalConnectivityEntry,
} from "../contracts/ldraw-digital-connectivity.js";

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
const digitalConnectivityByComponentId = new Map(
  ldrawDigitalConnectivity.entries.map((entry) => [entry.componentId, entry]),
);

export type CatalogCategory = "all" | AssortmentComponent["role"];

export const CATALOG_CATEGORIES: ReadonlyArray<{ id: CatalogCategory; label: string }> = [
  { id: "all", label: "Alle Teile" },
  { id: "head", label: "Köpfe" },
  { id: "headwear", label: "Kopfbedeckung" },
  { id: "torsoAssembly", label: "Oberkörper" },
  { id: "legsAssembly", label: "Beine" },
  { id: "handAccessory", label: "Zubehör" },
];

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
): LDrawDigitalConnectivityEntry | undefined => digitalConnectivityByComponentId.get(componentId);

export const digitallySupportedLDrawEntryForComponent = (
  componentId: string,
): VerifiedLDrawCatalogEntry | undefined => {
  const connectivity = digitalConnectivityByComponentId.get(componentId);
  return connectivity?.status === "digitally-supported"
    ? verifiedLDrawEntryForComponent(componentId)
    : undefined;
};

export const thumbnailForComponent = (component: AssortmentComponent): string => {
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
