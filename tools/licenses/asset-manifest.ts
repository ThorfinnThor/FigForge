import { createHash } from "node:crypto";
import {
  assetManifestSchema,
  publicNoticesSchema,
  type AssetManifest,
  type AssetManifestEntry,
  type LicenseEvidence,
  type PublicNotices,
  type SourceNotice,
} from "../../src/contracts/asset-manifest.js";
import type { MappingReview } from "../../src/contracts/mapping-review.js";
import type { ModelPackageIndex } from "../../src/contracts/model-package.js";

export const PUBLIC_NOTICES_PATH = "/licenses/figforge-attribution.json";

const hash = (content: string): string => createHash("sha256").update(content, "utf8").digest("hex");
const bytes = (content: string): number => Buffer.byteLength(content, "utf8");

const sourceNotices = ([
  {
    id: "src:fixture-ff04",
    name: "FigForge FF-04 synthetic fixture",
    scope: "synthetic-fixture",
    url: null,
    localPath: null,
    status: "not-applicable",
    attribution: "Interne synthetische Prüfgeometrie; kein Drittanbieter-Asset und nicht veröffentlichbar.",
    note: "Dient nur zur Prüfung von Szene, Ankern, Paketierung und Thumbnail-Reproduzierbarkeit.",
  },
  {
    id: "src:ldraw-assets",
    name: "LDraw Parts Library",
    scope: "ldraw-assets",
    url: "https://www.ldraw.org/",
    localPath: null,
    status: "blocked",
    attribution: "Keine LDraw-Datei ist in FF-10 enthalten.",
    note: "Release, Lizenzheader, transitive Abhängigkeiten, Dateipfade und Hashes müssen vor einem echten Assetpaket geprüft werden.",
  },
  {
    id: "src:rebrickable-catalog",
    name: "Rebrickable Catalog Downloads/CSV",
    scope: "catalog-metadata",
    url: "https://rebrickable.com/downloads/",
    localPath: null,
    status: "pending",
    attribution: "Rebrickable Catalog Downloads/CSV; kommerzielle Nutzung und Attribution sind noch als Projektbeleg abzulegen.",
    note: "Nur die gelockten Catalog-Downloads/CSV sind zulässig. Keine API und keine MOC-Dateien.",
  },
  {
    id: "src:three-runtime",
    name: "Three.js runtime",
    scope: "runtime",
    url: null,
    localPath: "/licenses/three-MIT.txt",
    status: "confirmed",
    attribution: "Three.js wird unter MIT-Hinweis ausgeliefert; der lokale Lizenztext ist im Release enthalten.",
    note: "Der Lizenztext wird separat gehasht und nicht mit Katalog- oder LDraw-Rechten gleichgesetzt.",
  },
  {
    id: "src:ldcad-shadow",
    name: "LDCad Shadow Library",
    scope: "ldraw-assets",
    url: "https://github.com/RolandMelkert/LDCadShadowLibrary",
    localPath: "/licenses/LDCadShadowLibrary-NOTICE.txt",
    status: "confirmed",
    attribution: "Ausgewählte Verbindungsmetadaten der LDCad Shadow Library, Revision 9b1131fb1991f8c0bfc072325e4e12f6271aba35, CC BY-SA 4.0.",
    note: "Die normalisierte digitale Anschluss-Registry wird unter denselben CC-BY-SA-4.0-Bedingungen bereitgestellt.",
  },
] satisfies SourceNotice[]).sort((left, right) => left.id.localeCompare(right.id));

const buildLicenseEvidence = (input: {
  packageId: string;
  threeLicenseSha256: string;
  ldcadShadowNoticeSha256: string;
}): LicenseEvidence[] => ([
  {
    id: "license:fixture:synthetic",
    sourceId: "src:fixture-ff04",
    subjectId: input.packageId,
    status: "not-applicable",
    licenseId: null,
    localPath: null,
    sha256: null,
    note: "Interne synthetische Prüfgeometrie; nicht als lizenzierter Katalog- oder LDraw-Asset freigegeben.",
  },
  {
    id: "license:ldraw:pending",
    sourceId: "src:ldraw-assets",
    subjectId: input.packageId,
    status: "blocked",
    licenseId: null,
    localPath: null,
    sha256: null,
    note: "Kein LDraw-Asset enthalten; Release- und Lizenzprüfung ist offen.",
  },
  {
    id: "license:rebrickable:catalog",
    sourceId: "src:rebrickable-catalog",
    subjectId: input.packageId,
    status: "pending",
    licenseId: null,
    localPath: null,
    sha256: null,
    note: "Projektbestätigung vorhanden; konkrete Belegablage und Attribution für Catalog Downloads/CSV stehen aus.",
  },
  {
    id: "license:three:mit",
    sourceId: "src:three-runtime",
    subjectId: "runtime:three",
    status: "confirmed",
    licenseId: "MIT",
    localPath: "/licenses/three-MIT.txt",
    sha256: input.threeLicenseSha256,
    note: "Lokaler MIT-Lizenztext für die Three.js-Laufzeit.",
  },
  {
    id: "license:ldcad-shadow:cc-by-sa-4.0",
    sourceId: "src:ldcad-shadow",
    subjectId: "data:ldraw-digital-connectivity",
    status: "confirmed",
    licenseId: "CC-BY-SA-4.0",
    localPath: "/licenses/LDCadShadowLibrary-NOTICE.txt",
    sha256: input.ldcadShadowNoticeSha256,
    note: "Attribution und Share-Alike-Hinweis für die normalisierte digitale Anschluss-Registry.",
  },
] satisfies LicenseEvidence[]).sort((left, right) => left.id.localeCompare(right.id));

const buildAssetEntries = (modelPackageIndex: ModelPackageIndex): AssetManifestEntry[] => {
  const sourceIds = ["src:fixture-ff04", "src:rebrickable-catalog"];
  const licenseEvidenceIds = ["license:fixture:synthetic", "license:rebrickable:catalog"];
  const blockedNote = "FF-10 ist synthetische Prüfgeometrie; ohne reale Asset-, Lizenz- und Release-Evidence nicht veröffentlichen.";
  const entries: AssetManifestEntry[] = [
    {
      id: `asset:model-package:${modelPackageIndex.package.id}`,
      kind: "model-package",
      path: modelPackageIndex.package.url,
      sha256: modelPackageIndex.package.sha256,
      bytes: modelPackageIndex.package.bytes,
      sourceIds,
      licenseEvidenceIds,
      status: "blocked",
      publishable: false,
      note: blockedNote,
    },
    ...modelPackageIndex.thumbnails.map((thumbnail) => ({
      id: `asset:thumbnail:${thumbnail.partId}`,
      kind: "thumbnail" as const,
      path: thumbnail.url,
      sha256: thumbnail.sha256,
      bytes: thumbnail.bytes,
      sourceIds,
      licenseEvidenceIds,
      status: "blocked" as const,
      publishable: false as const,
      note: blockedNote,
    })),
  ];
  return entries.sort((left, right) => left.id.localeCompare(right.id));
};

export type AssetManifestBuild = {
  manifest: AssetManifest;
  manifestContent: string;
  notices: PublicNotices;
  noticesContent: string;
};

export const buildAssetManifest = (input: {
  sourceLockSha256: string;
  modelPackageIndexSha256: string;
  mappingReviewSha256: string;
  modelPackageIndex: ModelPackageIndex;
  mappingReview: MappingReview;
  threeLicenseSha256: string;
  ldcadShadowNoticeSha256: string;
}): AssetManifestBuild => {
  if (input.mappingReview.openMappings.some(({ candidateIds }) => candidateIds.length > 0)) {
    throw new Error("FF-11 cannot publish guessed mapping candidates");
  }
  const licenseEvidence = buildLicenseEvidence({
    packageId: input.modelPackageIndex.package.id,
    threeLicenseSha256: input.threeLicenseSha256,
    ldcadShadowNoticeSha256: input.ldcadShadowNoticeSha256,
  });
  const openBlockers = [
    "FF-10 assets are synthetic FF-04 fixtures and are not publishable catalog assets.",
    "Rebrickable Catalog Downloads/CSV commercial-use evidence and attribution are still pending project documentation.",
    "Real LDraw assets require release, license-header, dependency, path and hash evidence before publication.",
    "GitHub review and Cloudflare Workers Builds release approval are not represented by this local manifest.",
  ];
  const notices = publicNoticesSchema.parse({
    schemaVersion: 1,
    ticket: "FF-11",
    sourcePolicy: "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.",
    sourceNotices,
    licenseEvidence,
    openBlockers,
  });
  const noticesContent = `${JSON.stringify(notices, null, 2)}\n`;
  const manifest = assetManifestSchema.parse({
    schemaVersion: 1,
    ticket: "FF-11",
    sourcePolicy: "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.",
    provenance: {
      sourceLockSha256: input.sourceLockSha256,
      modelPackageIndexSha256: input.modelPackageIndexSha256,
      mappingReviewSha256: input.mappingReviewSha256,
    },
    release: {
      status: "blocked",
      publishable: false,
      reason: "FF-10 enthält ausschließlich synthetische Prüfgeometrie; externe Asset-, Lizenz- und Review-Freigaben fehlen.",
    },
    noticesFile: {
      path: PUBLIC_NOTICES_PATH,
      sha256: hash(noticesContent),
      bytes: bytes(noticesContent),
    },
    assets: buildAssetEntries(input.modelPackageIndex),
    sourceNotices,
    licenseEvidence,
    openBlockers,
  });
  const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
  return { manifest, manifestContent, notices, noticesContent };
};
