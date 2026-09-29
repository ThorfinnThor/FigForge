import { createHash } from "node:crypto";
import type { AnchorRegistryDocument } from "../../src/contracts/anchor-registry.js";
import type { TestAssortment } from "../../src/contracts/test-assortment.js";
import {
  fixturePackageSchema,
  modelPackageIndexSchema,
  type FixturePackage,
  type FixturePackagePart,
  type ModelPackageIndex,
  type ThumbnailArtifact,
} from "../../src/contracts/model-package.js";
import {
  HEAD_OPTIONS,
  HEADWEAR_OPTIONS,
  LEFT_HAND_OPTIONS,
  RIGHT_HAND_OPTIONS,
} from "../../src/components/figure-poc-options.js";
import type { ScenePartDefinition } from "../../src/scene/types.js";

export const MAX_THUMBNAIL_BYTES = 60_000;
export const MODEL_PACKAGE_ID = "ff04-fixture-standard-v1";
export const MODEL_PACKAGE_URL = `/assets/model-packages/${MODEL_PACKAGE_ID}.json`;

const hash = (content: string): string => createHash("sha256").update(content, "utf8").digest("hex");
const bytes = (content: string): number => Buffer.byteLength(content, "utf8");
const fileStem = (id: string): string => id.replaceAll(":", "-");

const escapeXml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const catalogPartId = (id: string): string => id.replace(/-(?:left|right)$/u, "");

const fixturePartFromDefinition = (definition: ScenePartDefinition, assortmentIds: Set<string>): FixturePackagePart => {
  const sourcePartId = catalogPartId(definition.id);
  if (!assortmentIds.has(sourcePartId)) {
    throw new Error(`FF-10 fixture option is not present in FF-03 assortment: ${sourcePartId}`);
  }
  return {
    id: definition.id,
    label: definition.label,
    slot: definition.slot,
    placementFamily: definition.placementFamily,
    fixtureStyle: definition.fixtureStyle,
    sourceIds: [`catalog:${sourcePartId}`, "evidence:fixture:ff04-geometry"],
  };
};

const baseParts: readonly FixturePackagePart[] = [
  {
    id: "fixture:legs-assembly",
    label: "FF-04 synthetic legs assembly",
    slot: "legsAssembly",
    placementFamily: "fixture-standard-legs",
    fixtureStyle: "base-legs",
    sourceIds: ["evidence:fixture:ff04-geometry"],
  },
  {
    id: "fixture:torso-assembly",
    label: "FF-04 synthetic torso assembly",
    slot: "torsoAssembly",
    placementFamily: "fixture-standard-torso",
    fixtureStyle: "base-torso",
    sourceIds: ["evidence:fixture:ff04-geometry"],
  },
];

const renderShape = (part: FixturePackagePart): string => {
  switch (part.fixtureStyle) {
    case "base-legs":
      return '<path d="M91 192h28v-64h18v64h28v16H91z" fill="#234761"/><rect x="84" y="208" width="84" height="13" rx="5" fill="#172c3d"/>';
    case "base-torso":
      return '<rect x="74" y="76" width="108" height="100" rx="20" fill="#c84d36"/><circle cx="84" cy="175" r="17" fill="#f2cd37"/><circle cx="172" cy="175" r="17" fill="#f2cd37"/>';
    case "headwear":
      return '<path d="M73 78c2-28 20-44 55-44s53 16 55 44H73z" fill="#352517"/><ellipse cx="128" cy="36" rx="42" ry="12" fill="#4d3524"/>';
    case "hand-tool":
      return '<rect x="123" y="116" width="10" height="38" rx="5" fill="#4c3c2c"/><path d="M117 116h22l-5-58h-12z" fill="#9b9b94"/>';
    case "hand-shield":
      return '<path d="M87 67h82v98c-19 19-63 19-82 0z" fill="#5c8db8" stroke="#294d6b" stroke-width="6"/>';
    case "hand-staff":
      return '<path d="M122 206 137 57" stroke="#8c5b39" stroke-width="9"/><path d="M137 57 128 32 119 57z" fill="#c58b32"/>';
    case "plain":
      return '<circle cx="128" cy="118" r="58" fill="#f2cd37"/><rect x="108" y="47" width="40" height="15" rx="7" fill="#f2cd37"/>';
    case "grin":
    case "brows":
      return '<circle cx="128" cy="118" r="58" fill="#f2cd37"/><circle cx="108" cy="108" r="6" fill="#1f1b16"/><circle cx="148" cy="108" r="6" fill="#1f1b16"/><path d="M103 135c13 15 37 15 50 0" fill="none" stroke="#1f1b16" stroke-width="5" stroke-linecap="round"/>';
  }
};

export const renderFixtureThumbnail = (part: FixturePackagePart): string => {
  const label = escapeXml(part.label);
  const id = escapeXml(part.id);
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-labelledby="title description">',
    `<title id="title">${label}</title>`,
    `<desc id="description">Synthetic FF-04 fixture thumbnail; not publishable.</desc>`,
    '<rect width="256" height="256" rx="24" fill="#f5f6f4"/>',
    '<rect x="16" y="16" width="224" height="224" rx="18" fill="#ffffff" stroke="#dde3de" stroke-width="2"/>',
    renderShape(part),
    `<text x="32" y="232" fill="#56636a" font-family="Arial,sans-serif" font-size="9">SYNTHETIC · FF-04 · ${id}</text>`,
    '</svg>',
  ].join("\n");
};

export type FixtureModelPackageBuild = {
  package: FixturePackage;
  packageContent: string;
  thumbnailContents: ReadonlyMap<string, string>;
  index: ModelPackageIndex;
};

export const buildFixtureModelPackage = (input: {
  assortment: TestAssortment;
  anchorRegistry: AnchorRegistryDocument;
  assortmentSha256: string;
  sourceLockSha256: string;
  anchorRegistrySha256: string;
}): FixtureModelPackageBuild => {
  const assortmentIds = new Set(input.assortment.components.map(({ id }) => id));
  const optionDefinitions = [
    ...HEAD_OPTIONS,
    ...HEADWEAR_OPTIONS,
    ...LEFT_HAND_OPTIONS,
    ...RIGHT_HAND_OPTIONS,
  ];
  const parts = [
    ...baseParts,
    ...optionDefinitions.map((definition) => fixturePartFromDefinition(definition, assortmentIds)),
  ].sort((left, right) => left.id.localeCompare(right.id));

  const fixturePackage = fixturePackageSchema.parse({
    schemaVersion: 1,
    ticket: "FF-10",
    packageId: MODEL_PACKAGE_ID,
    kind: "synthetic-fixture",
    publishable: false,
    sourcePolicy: "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.",
    sourceHashes: {
      assortmentSha256: input.assortmentSha256,
      sourceLockSha256: input.sourceLockSha256,
      anchorRegistrySha256: input.anchorRegistrySha256,
    },
    fixture: {
      profileId: input.anchorRegistry.profileId,
      source: input.anchorRegistry.source,
      coordinateSystem: input.anchorRegistry.coordinateSystem,
      anchors: input.anchorRegistry.anchors.map(({ id, slot, parent, placementFamily, transform }) => ({
        id,
        slot,
        parent,
        placementFamily,
        transform,
      })),
    },
    cameraPresets: ["three-quarter", "front", "back"],
    parts,
  });
  const packageContent = `${JSON.stringify(fixturePackage, null, 2)}\n`;

  const thumbnailContents = new Map<string, string>();
  const thumbnails: ThumbnailArtifact[] = [];
  for (const part of parts) {
    const content = renderFixtureThumbnail(part);
    const thumbnailId = `thumbnail:${part.id}`;
    const url = `/assets/thumbnails/${fileStem(part.id)}.svg`;
    thumbnailContents.set(url, content);
    thumbnails.push({
      id: thumbnailId,
      partId: part.id,
      url,
      format: "svg",
      sha256: hash(content),
      bytes: bytes(content),
      width: 256,
      height: 256,
      appearance: "synthetic",
      publishable: false,
    });
  }

  const index = modelPackageIndexSchema.parse({
    schemaVersion: 1,
    ticket: "FF-10",
    sourcePolicy: "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.",
    generatedFrom: {
      assortmentSha256: input.assortmentSha256,
      sourceLockSha256: input.sourceLockSha256,
      anchorRegistrySha256: input.anchorRegistrySha256,
    },
    package: {
      id: MODEL_PACKAGE_ID,
      url: MODEL_PACKAGE_URL,
      format: "json",
      sha256: hash(packageContent),
      bytes: bytes(packageContent),
      appearance: "synthetic",
      publishable: false,
    },
    thumbnails: thumbnails.sort((left, right) => left.id.localeCompare(right.id)),
    summary: {
      partCount: parts.length,
      thumbnailCount: thumbnails.length,
      publishablePackageCount: 0,
      maxThumbnailBytes: MAX_THUMBNAIL_BYTES,
    },
    openBlockers: [
      "FF-10 outputs are synthetic FF-04 fixtures and are not publishable catalog assets.",
      "Real LDraw model packages require separately verified release, license, dependency and hash evidence.",
      "Only Rebrickable Catalog Downloads/CSV are allowed as catalog inputs; no MOC files or API data are included.",
    ],
  });

  return { package: fixturePackage, packageContent, thumbnailContents, index };
};
