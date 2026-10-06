import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { type CatalogRole } from "../src/contracts/catalog-package.js";
import { ldrawRuntimePackageSchema } from "../src/contracts/ldraw-runtime-package.js";
import { OFFICIAL_LDRAW_PUBLIC_PATH } from "../src/scene/ldraw-release.js";
import {
  confirmAssemblyColors,
  deriveAssemblyColorCodeTable,
  parseAssemblyPartNum,
} from "./lib/rebrickable-assembly-colors.js";
import { handGripEvidenceFromLDCadShadow } from "./lib/ldcad-shadow-connectivity.js";

const root = process.cwd();
const libraryRoot = resolve(root, "public", OFFICIAL_LDRAW_PUBLIC_PATH.slice(1));
const sha256 = (content: string | Buffer): string => createHash("sha256").update(content).digest("hex");

const lock = JSON.parse(await readFile(resolve(root, "data/ldraw-source.lock.json"), "utf8")) as {
  sourcePolicy: string;
  release: string;
  archiveSha256: string;
  noticePath: string;
  contentPolicy: string;
};
const catalog = JSON.parse(await readFile(resolve(root, "data/generated/ldraw-expanded-catalog.json"), "utf8")) as {
  sourcePolicy: string;
  source: { release: string; archiveSha256: string; noticePath: string };
  entries: Array<{
    componentId: string;
    role: string;
    rebrickablePartNum: string;
    status: string;
    ldrawFile: string;
    ldrawUpdate: string;
    mappingEvidence: string;
    assemblyWrapperFor: string | null;
    modelUrl: string;
    modelSha256: string;
    thumbnailUrl: string;
    thumbnailSha256: string;
    thumbnailBytes: number;
    previewColorRgb: string;
    previewColorEvidence: string;
    placementMode: string;
    placementTransformLdu: number[];
    digitalValidation: null | {
      status: "passed";
      reasonCode: null;
      gripLengthLdu: number;
      sampledPointCount: number;
      protectedBodyBoxCount: number;
      collisionSampleCount: 0;
      gripCandidatesTested: number;
      safeGripCandidatesFound: 1;
      selectedGripCandidateIndex: number;
      orientationCandidatesTested: number;
      selectedOrientationIndex: number;
      physicalFitGuaranteed: false;
      gripPrimitive: string;
      gripEvidenceSource: "official-ldraw-geometry" | "ldcad-shadow-snap";
      limits: { minimumGripLengthLdu: number };
      clearanceMode?: "closed-mesh";
    };
    geometryFallback: null | { kind: string; parentPartNums: string[] };
    name: string;
    rebrickableCategoryName: string;
    colorNames: string[];
  }>;
  assemblyColorCodes: {
    codes: Array<{ code: string; colorName: string; colorRgb: string; evidencePartNums: string[] }>;
    unresolvedCodes: Array<{ code: string; colorNames: string[]; reason: string; evidencePartNums: string[] }>;
    splitLegCodes: Array<{ code: string; colorName: string; colorRgb: string; evidencePartNums: string[] }>;
    unresolvedSplitLegCodes: Array<{ code: string; colorNames: string[]; reason: string; evidencePartNums: string[] }>;
    referenceAssemblies: Record<"torso" | "legs" | "dualMouldLegs", {
      shortcutCount: number;
      agreeingShortcutCount: number;
      lines: Array<{ component: string; transform: number[] }>;
    }>;
  };
  summary: {
    digitallySupportedCount: number;
    headCount: number;
    headwearCount: number;
    torsoAssemblyCount: number;
    legsAssemblyCount: number;
    handAccessoryCount: number;
    directMappingCount: number;
    colorCodedAssemblyCount: number;
    officialAssemblyWrapperCount: number;
    ambiguousAssemblyWrappersExcluded: number;
    unprintedColorCodedAssemblyCount: number;
    printParentGeometryFallbackCount: number;
    generatedAssetCount: number;
    sharedOfficialFileCount: number;
    renderFailuresExcluded: number;
    accessoryGripCandidatesExcluded: number;
    accessoryLdcadGripCandidatesDisambiguated: number;
    accessoryLdcadPrintParentGripCandidatesEvaluated: number;
    accessoryMultipleGripCandidatesEvaluated: number;
    accessoryMultipleGripCandidatesPassed: number;
    accessoryMultipleGripCandidatesAmbiguous: number;
    accessoryMultipleGripCandidatesNoSafe: number;
    accessoryMultipleGripCandidatesRenderFailed: number;
    accessoryPlacementCandidatesEvaluated: number;
    accessoryPlacementRenderFailuresExcluded: number;
    digitalPlacementPassedCount: number;
    digitalPlacementRejectionsExcluded: number;
    mocFilesUsed: number;
  };
  digitalPlacementRejections: Array<{
    rebrickablePartNum: string;
    ldrawFile: string;
    reasonCode: string;
    collisionSampleCount: number;
    gripCandidatesTested: number;
    safeGripCandidatesFound: number;
    orientationCollisionCountsByGrip: number[][];
  }>;
};
const connectivityRegistry = JSON.parse(
  await readFile(resolve(root, "data/generated/ldraw-digital-connectivity.json"), "utf8"),
) as { sourceFiles: Array<{ path: string }> };
const pinnedShadowFiles = new Set(connectivityRegistry.sourceFiles.map(({ path }) =>
  path.replace(/^data\/vendor\/ldcad-shadow\//u, "")
));

const runtimeFileByRole = {
  head: "head.json",
  headwear: "headwear.json",
  torsoAssembly: "torso-assembly.json",
  legsAssembly: "legs-assembly.json",
  handAccessory: "hand-accessory.json",
} as const satisfies Record<CatalogRole, string>;
const { compositions: assemblyCompositions } = JSON.parse(
  await readFile(resolve(root, "data/generated/ldraw-assembly-compositions.json"), "utf8"),
) as {
  compositions: Record<string, {
    kind: string;
    printRendered: boolean;
    referenceShortcutCount: number;
    agreeingReferenceShortcutCount: number;
    components: Array<{
      file: string;
      colorRole: "catalog" | "arms" | "hands" | "legs" | "boots" | "leftLeg" | "rightLeg";
      colorName: string | null;
      colorRgb: string | null;
      transform: number[];
    }>;
  }>;
};

assert.equal(catalog.sourcePolicy, "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.");
assert.equal(catalog.sourcePolicy, lock.sourcePolicy);
assert.equal(catalog.source.release, lock.release);
assert.equal(catalog.source.archiveSha256, lock.archiveSha256);
assert.equal(catalog.source.noticePath, lock.noticePath);
assert.match(lock.contentPolicy, /MOC files are excluded/u);
assert.equal(catalog.summary.mocFilesUsed, 0);
assert.equal(catalog.entries.length, catalog.summary.digitallySupportedCount);
assert.equal(
  catalog.summary.headCount
    + catalog.summary.headwearCount
    + catalog.summary.torsoAssemblyCount
    + catalog.summary.legsAssemblyCount
    + catalog.summary.handAccessoryCount,
  catalog.entries.length,
);
assert(catalog.entries.length >= 800, "Expanded catalog unexpectedly dropped below 800 renderable parts");
assert.equal(catalog.summary.digitalPlacementPassedCount, catalog.summary.handAccessoryCount);
assert.equal(catalog.summary.accessoryLdcadGripCandidatesDisambiguated, 39);
assert.equal(catalog.summary.accessoryLdcadPrintParentGripCandidatesEvaluated, 12);
assert.equal(catalog.summary.digitalPlacementRejectionsExcluded, catalog.digitalPlacementRejections.length);
assert.equal(
  catalog.summary.accessoryPlacementCandidatesEvaluated,
  catalog.summary.digitalPlacementPassedCount
    + catalog.summary.digitalPlacementRejectionsExcluded
    + catalog.summary.accessoryPlacementRenderFailuresExcluded,
);
assert.equal(
  catalog.summary.accessoryMultipleGripCandidatesEvaluated,
  catalog.summary.accessoryMultipleGripCandidatesPassed
    + catalog.summary.accessoryMultipleGripCandidatesAmbiguous
    + catalog.summary.accessoryMultipleGripCandidatesNoSafe
    + catalog.summary.accessoryMultipleGripCandidatesRenderFailed,
);

const catalogEntriesSha256 = sha256(JSON.stringify(catalog.entries));
const runtimeManifest = JSON.parse(
  await readFile(resolve(root, "data/generated/ldraw-runtime/manifest.json"), "utf8"),
) as {
  schemaVersion: number;
  sourcePolicy: string;
  catalogEntriesSha256: string;
  totalEntryCount: number;
  packages: Array<{ role: CatalogRole; fileName: string; entryCount: number }>;
};
assert.equal(runtimeManifest.schemaVersion, 2);
assert.equal(runtimeManifest.sourcePolicy, catalog.sourcePolicy);
assert.equal(runtimeManifest.catalogEntriesSha256, catalogEntriesSha256);
assert.equal(runtimeManifest.totalEntryCount, catalog.entries.length);
assert.equal(runtimeManifest.packages.length, 5);
let runtimeEntryCount = 0;
for (const [role, fileName] of Object.entries(runtimeFileByRole) as Array<[CatalogRole, string]>) {
  const runtimePackage = ldrawRuntimePackageSchema.parse(JSON.parse(
    await readFile(resolve(root, "data/generated/ldraw-runtime", fileName), "utf8"),
  ));
  const runtimeSearchTextById = new Map(runtimePackage.entries.map((entry) => [
    entry.componentId,
    entry.searchText,
  ]));
  const expectedEntries = catalog.entries
    .filter((entry) => entry.role === role)
    .map((entry) => ({
      componentId: entry.componentId,
      rebrickablePartNum: entry.rebrickablePartNum,
      status: entry.status,
      ldrawFile: entry.ldrawFile,
      ldrawUpdate: entry.ldrawUpdate,
      modelUrl: entry.modelUrl,
      thumbnailUrl: entry.thumbnailUrl,
      searchText: runtimeSearchTextById.get(entry.componentId),
      geometryFallback: entry.geometryFallback,
      placementMode: entry.placementMode,
      placementTransformLdu: entry.placementTransformLdu,
    }));
  assert.equal(runtimePackage.sourcePolicy, catalog.sourcePolicy);
  assert.equal(runtimePackage.catalogEntriesSha256, catalogEntriesSha256);
  assert.equal(runtimePackage.role, role);
  assert.deepEqual(runtimePackage.entries, expectedEntries);
  for (const runtimeEntry of runtimePackage.entries) {
    const catalogEntry = catalog.entries.find(({ componentId }) => componentId === runtimeEntry.componentId);
    assert(catalogEntry, `Runtime search document has no expanded catalog entry: ${runtimeEntry.componentId}`);
    assert(runtimeEntry.searchText.includes(catalogEntry.name));
    assert(runtimeEntry.searchText.includes(`Category: ${catalogEntry.rebrickableCategoryName}.`));
    assert(runtimeEntry.searchText.includes(`Part ID: ${catalogEntry.rebrickablePartNum}.`));
    assert.match(runtimeEntry.searchText, /Official LDraw description: .+\./u);
    for (const colorName of new Set(catalogEntry.colorNames)) {
      assert(runtimeEntry.searchText.includes(colorName));
    }
  }
  const manifestEntry = runtimeManifest.packages.find((entry) => entry.role === role);
  assert.deepEqual(manifestEntry, { role, fileName, entryCount: expectedEntries.length });
  runtimeEntryCount += runtimePackage.entryCount;
}
assert.equal(runtimeEntryCount, catalog.entries.length);
for (const rejection of catalog.digitalPlacementRejections) {
  assert(rejection.ldrawFile.startsWith("parts/") && !rejection.ldrawFile.toLowerCase().includes("moc"));
  assert([
    "grip-too-short",
    "accessory-extent-exceeds-limit",
    "reference-figure-clearance-failed",
    "no-safe-grip-candidate",
    "multiple-safe-grip-candidates",
  ].includes(rejection.reasonCode));
  assert(rejection.gripCandidatesTested >= 1);
  assert.equal(rejection.orientationCollisionCountsByGrip.length, rejection.gripCandidatesTested);
  assert(rejection.orientationCollisionCountsByGrip.every((counts) => counts.length >= 8 && counts.length % 8 === 0));
  if (rejection.reasonCode === "multiple-safe-grip-candidates") {
    assert(rejection.safeGripCandidatesFound > 1);
  } else {
    assert.equal(rejection.safeGripCandidatesFound, 0);
  }
  assert(rejection.collisionSampleCount >= 0);
}

const publicLDrawRoot = resolve(root, `public${OFFICIAL_LDRAW_PUBLIC_PATH}`);
assert.deepEqual(
  (await readdir(dirname(publicLDrawRoot), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^official-\d{4}$/u.test(entry.name))
    .map(({ name }) => name),
  [basename(publicLDrawRoot)],
  "Only the locked LDraw release may be published",
);
const fileMap = JSON.parse(await readFile(resolve(publicLDrawRoot, "file-map.json"), "utf8")) as Record<string, unknown>;
const fileMapEntries = Object.entries(fileMap);
const fileMapKey = (file: string): string => file.startsWith("parts/s/") ? file.slice("parts/".length) : basename(file);
assert.equal(fileMapEntries.length, catalog.summary.sharedOfficialFileCount);
for (const [reference, mappedPath] of fileMapEntries) {
  assert(reference.endsWith(".dat") && !reference.includes("\\"), `Invalid LDraw file-map reference: ${reference}`);
  assert(typeof mappedPath === "string" && mappedPath.endsWith(".dat"), `Invalid LDraw file-map target: ${reference}`);
  const resolvedTarget = resolve(publicLDrawRoot, "parts", mappedPath);
  assert(resolvedTarget.startsWith(`${publicLDrawRoot}/`), `LDraw file-map target escapes the library: ${mappedPath}`);
  await readFile(resolvedTarget);
}

const ids = new Set<string>();
const assetsByModelUrl = new Map<string, {
  ldrawFile: string;
  previewColorRgb: string;
  modelSha256: string;
  thumbnailUrl: string;
  thumbnailSha256: string;
  thumbnailBytes: number;
}>();
const normalizedCatalog = JSON.parse(await readFile(resolve(root, "data/generated/catalog-normalized.json"), "utf8")) as {
  parts: Array<{
    partNum: string;
    name: string;
    printParentPartNums: string[];
    colorVariants: Array<{ colorName: string; rgb: string }>;
  }>;
};
const normalizedByPartNum = new Map(normalizedCatalog.parts.map((part) => [part.partNum.toLowerCase(), part]));

// The published colour code table must be exactly what the locked catalog yields.
const colorRgbsByName = new Map<string, Set<string>>();
for (const part of normalizedCatalog.parts) {
  for (const { colorName, rgb } of part.colorVariants) {
    colorRgbsByName.set(colorName, (colorRgbsByName.get(colorName) ?? new Set()).add(rgb));
  }
}
const colorRgbByName = new Map([...colorRgbsByName]
  .filter(([, rgbs]) => rgbs.size === 1 && /^[A-F0-9]{6}$/u.test([...rgbs][0]!))
  .map(([name, rgbs]) => [name, [...rgbs][0]!]));
const knownAssemblyColorNames = new Set(colorRgbByName.keys());
const assemblyColorCodes = deriveAssemblyColorCodeTable(
  normalizedCatalog.parts.filter(({ partNum }) => parseAssemblyPartNum(partNum)?.kind !== "splitLegs"),
  knownAssemblyColorNames,
);
const splitLegColorCodes = deriveAssemblyColorCodeTable(
  normalizedCatalog.parts.filter(({ partNum }) => parseAssemblyPartNum(partNum)?.kind === "splitLegs"),
  knownAssemblyColorNames,
);
assert.deepEqual(
  catalog.assemblyColorCodes.codes,
  [...assemblyColorCodes.codes].map(([code, colorName]) => ({
    code,
    colorName,
    colorRgb: colorRgbByName.get(colorName),
    evidencePartNums: assemblyColorCodes.evidence.get(code) ?? [],
  })),
  "Published assembly colour codes differ from the locked catalog",
);
assert.equal(catalog.assemblyColorCodes.unresolvedCodes.length, assemblyColorCodes.unresolved.size);
for (const unresolved of catalog.assemblyColorCodes.unresolvedCodes) {
  assert(!catalog.assemblyColorCodes.codes.some(({ code }) => code === unresolved.code));
}
assert.deepEqual(
  catalog.assemblyColorCodes.splitLegCodes,
  [...splitLegColorCodes.codes].map(([code, colorName]) => ({
    code,
    colorName,
    colorRgb: colorRgbByName.get(colorName),
    evidencePartNums: splitLegColorCodes.evidence.get(code) ?? [],
  })),
  "Published split-leg colour codes differ from the locked catalog",
);
assert.equal(catalog.assemblyColorCodes.unresolvedSplitLegCodes.length, splitLegColorCodes.unresolved.size);
for (const reference of Object.values(catalog.assemblyColorCodes.referenceAssemblies)) {
  assert(reference.agreeingShortcutCount / reference.shortcutCount >= 0.9, "Reference assembly lacks shortcut agreement");
}
for (const entry of catalog.entries) {
  assert(!ids.has(entry.componentId), `Duplicate component ID: ${entry.componentId}`);
  ids.add(entry.componentId);
  assert.equal(entry.status, "verified");
  assert(["head", "headwear", "torsoAssembly", "legsAssembly", "handAccessory"].includes(entry.role));
  assert(entry.componentId.startsWith(`catalog:${entry.role}:`));
  assert(entry.ldrawFile.startsWith("parts/"));
  assert(!entry.ldrawFile.toLowerCase().includes("moc"));
  assert(["curated-official-metadata", "exact-filename", "explicit-keyword", "official-assembly-wrapper", "rebrickable-print-parent", "rebrickable-assembly-code"].includes(entry.mappingEvidence));
  if (entry.mappingEvidence === "official-assembly-wrapper") {
    const assemblyWrapperFor = entry.assemblyWrapperFor;
    if (!assemblyWrapperFor?.startsWith("parts/")) throw new Error(`Missing assembly wrapper source: ${entry.componentId}`);
    const wrapperSource = await readFile(resolve(libraryRoot, entry.ldrawFile), "utf8");
    const wrappedReference = assemblyWrapperFor.slice("parts/".length).toLowerCase();
    assert(wrapperSource.split(/\r?\n/u).some((line) =>
      line.startsWith("1 ") && line.trim().split(/\s+/u).at(-1)?.replaceAll("\\", "/").toLowerCase() === wrappedReference
    ));
  } else {
    assert.equal(entry.assemblyWrapperFor, null);
  }
  const isPrintParentFallback = entry.mappingEvidence === "rebrickable-print-parent";
  if (entry.mappingEvidence === "rebrickable-assembly-code") {
    const composition = assemblyCompositions[entry.componentId];
    assert(composition, `Missing assembly composition: ${entry.componentId}`);
    assert.equal(composition.kind, "rebrickable-color-coded-assembly");
    const parsed = parseAssemblyPartNum(entry.rebrickablePartNum);
    const colors = parsed && confirmAssemblyColors(
      entry.rebrickablePartNum,
      entry.name,
      parsed.kind === "splitLegs" ? splitLegColorCodes : assemblyColorCodes,
    );
    assert(parsed && colors, `Assembly colours are not confirmed by code and name: ${entry.componentId}`);
    assert.equal(entry.role, colors.kind === "torso" ? "torsoAssembly" : "legsAssembly");
    if (colors.kind === "splitLegs") {
      const normalizedPart = normalizedByPartNum.get(entry.rebrickablePartNum.toLowerCase());
      const hipRgbs = [...new Set((normalizedPart?.colorVariants ?? [])
        .map(({ rgb }) => rgb)
        .filter((rgb) => /^[A-F0-9]{6}$/u.test(rgb)))];
      assert.equal(hipRgbs.length, 1, `Asymmetric legs need exactly one catalog-backed hip colour: ${entry.componentId}`);
      assert(composition.components.some(({ file, colorRole }) => file === "parts/3817c.dat" && colorRole === "leftLeg"));
      assert(composition.components.some(({ file, colorRole }) => file === "parts/3816c.dat" && colorRole === "rightLeg"));
    }
    const reference = parsed.kind === "legs" && parsed.bootCode
      ? catalog.assemblyColorCodes.referenceAssemblies.dualMouldLegs
      : colors.kind === "torso"
        ? catalog.assemblyColorCodes.referenceAssemblies.torso
        : catalog.assemblyColorCodes.referenceAssemblies.legs;
    assert.equal(composition.referenceShortcutCount, reference.shortcutCount);
    assert.equal(composition.agreeingReferenceShortcutCount, reference.agreeingShortcutCount);
    assert.deepEqual(composition.components.map(({ transform }) => transform), reference.lines.map(({ transform }) => transform));
    assert(composition.components.some(({ file, colorRole }) => file === entry.ldrawFile && colorRole === "catalog"));
    for (const component of composition.components) {
      assert(component.file.startsWith("parts/") && fileMap[fileMapKey(component.file)], `Unmapped component: ${component.file}`);
      const expectedColorName: string | null = component.colorRole === "catalog"
        ? null
        : colors.kind === "torso"
          ? component.colorRole === "arms" ? colors.armColorName : colors.handColorName
          : colors.kind === "splitLegs"
            ? component.colorRole === "leftLeg"
              ? colors.leftLegColorName
              : component.colorRole === "rightLeg" ? colors.rightLegColorName : null
            : component.colorRole === "boots" ? colors.bootColorName ?? null : colors.legColorName;
      assert.equal(component.colorName, expectedColorName, `Wrong ${component.colorRole} colour: ${entry.componentId}`);
      assert.equal(component.colorRgb, expectedColorName ? colorRgbByName.get(expectedColorName) : null);
    }
    // A printed number is rendered only when at least one composed official component carries a pattern.
    const componentDescriptions = await Promise.all(composition.components.map(async ({ file }) =>
      (await readFile(resolve(libraryRoot, file), "utf8")).split(/\r?\n/u)[0] ?? ""
    ));
    assert.equal(
      composition.printRendered,
      !parsed.printed || componentDescriptions.some((description) => /\bPattern\b/u.test(description)),
    );
    if (composition.printRendered) {
      assert.equal(entry.geometryFallback, null);
    } else {
      assert.equal(entry.geometryFallback?.kind, "unprinted-assembly-code");
      assert.equal(entry.previewColorEvidence, "rebrickable-elements-first", `Unprinted assembly lacks catalog colour: ${entry.componentId}`);
      const normalizedPart = normalizedByPartNum.get(entry.rebrickablePartNum.toLowerCase());
      assert.deepEqual(entry.geometryFallback.parentPartNums, normalizedPart?.printParentPartNums ?? []);
    }
  } else {
    assert(!Object.hasOwn(assemblyCompositions, entry.componentId), `Unexpected assembly composition: ${entry.componentId}`);
  }
  const isUnprintedAssembly = assemblyCompositions[entry.componentId]?.printRendered === false;
  if (isPrintParentFallback) {
    assert.equal(entry.geometryFallback?.kind, "unprinted-print-parent");
    assert(entry.geometryFallback.parentPartNums.length > 0);
    const normalizedPart = normalizedByPartNum.get(entry.rebrickablePartNum.toLowerCase());
    assert(normalizedPart, `Missing normalized catalog part: ${entry.rebrickablePartNum}`);
    assert(entry.geometryFallback.parentPartNums.every((parent) => normalizedPart.printParentPartNums.includes(parent)));
  } else if (!isUnprintedAssembly) {
    assert.equal(entry.geometryFallback, null);
  }
  assert.equal(entry.placementMode, entry.role === "handAccessory" ? "snap-connector" : "prototype-family-origin");
  assert.equal(entry.placementTransformLdu.length, 16);
  assert(entry.placementTransformLdu.every(Number.isFinite));
  if (entry.role === "handAccessory") {
    assert.equal(entry.digitalValidation?.status, "passed");
    assert.equal(entry.digitalValidation.reasonCode, null);
    assert(entry.digitalValidation.gripLengthLdu >= entry.digitalValidation.limits.minimumGripLengthLdu);
    assert(entry.digitalValidation.sampledPointCount > 0);
    assert(entry.digitalValidation.protectedBodyBoxCount > 0);
    assert.equal(entry.digitalValidation.collisionSampleCount, 0);
    assert(entry.digitalValidation.gripCandidatesTested >= 1);
    assert.equal(entry.digitalValidation.safeGripCandidatesFound, 1);
    assert(
      entry.digitalValidation.selectedGripCandidateIndex >= 0
        && entry.digitalValidation.selectedGripCandidateIndex < entry.digitalValidation.gripCandidatesTested,
    );
    assert(entry.digitalValidation.orientationCandidatesTested >= 8);
    assert(
      entry.digitalValidation.selectedOrientationIndex >= 0
        && entry.digitalValidation.selectedOrientationIndex < entry.digitalValidation.orientationCandidatesTested,
    );
    assert.equal(entry.digitalValidation.physicalFitGuaranteed, false);
    if (entry.digitalValidation.clearanceMode !== undefined) {
      assert.equal(entry.digitalValidation.clearanceMode, "closed-mesh");
    }
    if (entry.digitalValidation.gripEvidenceSource === "ldcad-shadow-snap") {
      assert.match(entry.digitalValidation.gripPrimitive, /^ldcad-shadow:parts\/[a-z0-9-]+\.dat#SNAP_CYL:\d+$/u);
      const match = /^ldcad-shadow:(parts\/[a-z0-9-]+\.dat)#SNAP_CYL:\d+$/u.exec(
        entry.digitalValidation.gripPrimitive,
      );
      assert(match, `Invalid LDCad grip evidence: ${entry.componentId}`);
      const sourcePath = match[1]!;
      assert(pinnedShadowFiles.has(sourcePath), `Unpinned LDCad grip evidence: ${entry.componentId}`);
      const shadowSource = await readFile(resolve(root, "data/vendor/ldcad-shadow", sourcePath), "utf8");
      const evidence = handGripEvidenceFromLDCadShadow(sourcePath, shadowSource)
        .find(({ primitive }) => primitive === entry.digitalValidation?.gripPrimitive);
      assert(evidence, `LDCad grip evidence cannot be reproduced: ${entry.componentId}`);
      assert.equal(evidence.lengthLdu, entry.digitalValidation.gripLengthLdu);
    } else {
      assert.match(entry.digitalValidation.gripPrimitive, /4-4cyl[ic]\.dat$/u);
    }
  } else {
    assert.equal(entry.digitalValidation, null);
  }
  const assetIdentity = {
    ldrawFile: entry.ldrawFile,
    previewColorRgb: entry.previewColorRgb,
    modelSha256: entry.modelSha256,
    thumbnailUrl: entry.thumbnailUrl,
    thumbnailSha256: entry.thumbnailSha256,
    thumbnailBytes: entry.thumbnailBytes,
  };
  const existingAsset = assetsByModelUrl.get(entry.modelUrl);
  if (existingAsset) {
    assert(isPrintParentFallback || isUnprintedAssembly, `Direct mapping reuses model URL: ${entry.modelUrl}`);
    assert.deepEqual(assetIdentity, existingAsset, `Inconsistent shared geometry asset: ${entry.modelUrl}`);
    continue;
  }
  assetsByModelUrl.set(entry.modelUrl, assetIdentity);

  const model = await readFile(resolve(root, `public${entry.modelUrl}`));
  const thumbnail = await readFile(resolve(root, `public${entry.thumbnailUrl}`));
  assert.equal(sha256(model), entry.modelSha256, `Model hash mismatch: ${entry.componentId}`);
  for (const component of assemblyCompositions[entry.componentId]?.components ?? []) {
    const modelSource = model.toString("utf8");
    assert(modelSource.includes(` ${fileMapKey(component.file)}`), `Composed model misses ${component.file}: ${entry.componentId}`);
    if (component.colorRgb) assert(modelSource.includes(`VALUE #${component.colorRgb} `), `Composed model misses colour: ${entry.componentId}`);
  }
  assert(fileMap[fileMapKey(entry.ldrawFile)], `Mapped part is missing from the browser file map: ${entry.ldrawFile}`);
  assert.equal(sha256(thumbnail), entry.thumbnailSha256, `Thumbnail hash mismatch: ${entry.componentId}`);
  assert.equal(thumbnail.byteLength, entry.thumbnailBytes, `Thumbnail byte count mismatch: ${entry.componentId}`);
  assert(thumbnail.byteLength <= 10_000, `Thumbnail budget exceeded: ${entry.componentId}`);
  assert.equal(thumbnail.subarray(0, 4).toString("hex"), "52494646", `Thumbnail is not WebP/RIFF: ${entry.componentId}`);
  const officialPart = await readFile(resolve(publicLDrawRoot, "parts", basename(entry.ldrawFile)), "utf8");
  assert(/!LDRAW_ORG (?:Part|Shortcut)\b/u.test(officialPart), `Mapped file is not an official LDraw part: ${entry.ldrawFile}`);
}
assert.equal(
  catalog.summary.directMappingCount
    + catalog.summary.colorCodedAssemblyCount
    + catalog.summary.printParentGeometryFallbackCount,
  catalog.entries.length,
);
assert.equal(catalog.summary.colorCodedAssemblyCount, catalog.entries.filter(({ mappingEvidence }) => mappingEvidence === "rebrickable-assembly-code").length);
assert.equal(catalog.summary.officialAssemblyWrapperCount, catalog.entries.filter(({ mappingEvidence }) => mappingEvidence === "official-assembly-wrapper").length);
assert.equal(catalog.summary.ambiguousAssemblyWrappersExcluded, 6);
assert.equal(Object.keys(assemblyCompositions).length, catalog.summary.colorCodedAssemblyCount);
assert.equal(
  catalog.summary.unprintedColorCodedAssemblyCount,
  catalog.entries.filter(({ geometryFallback }) => geometryFallback?.kind === "unprinted-assembly-code").length,
);
assert.equal(catalog.summary.printParentGeometryFallbackCount, catalog.entries.filter(({ mappingEvidence }) => mappingEvidence === "rebrickable-print-parent").length);
assert.equal(catalog.summary.generatedAssetCount, assetsByModelUrl.size);

const notice = await readFile(resolve(root, `public${lock.noticePath}`), "utf8");
assert(notice.includes("Creative Commons Attribution License 2.0 (CC BY 2.0)"));
assert(notice.includes("Creative Commons Attribution License 4.0 International (CC BY 4.0)"));
const cc20 = await readFile(resolve(root, "public/licenses/LDraw-CAlicense-2.0.txt"), "utf8");
const cc40 = await readFile(resolve(root, "public/licenses/LDraw-CAlicense-4.0.txt"), "utf8");
assert(cc20.includes("Attribution 2.0"));
assert(cc40.includes("Attribution 4.0 International"));

console.log(JSON.stringify({
  message: "expanded official LDraw catalog valid",
  entries: catalog.entries.length,
  heads: catalog.summary.headCount,
  headwear: catalog.summary.headwearCount,
  torsoAssemblies: catalog.summary.torsoAssemblyCount,
  legsAssemblies: catalog.summary.legsAssemblyCount,
  handAccessories: catalog.summary.handAccessoryCount,
  printParentGeometryFallbacks: catalog.summary.printParentGeometryFallbackCount,
  colorCodedAssemblies: catalog.summary.colorCodedAssemblyCount,
  unprintedColorCodedAssemblies: catalog.summary.unprintedColorCodedAssemblyCount,
  generatedAssets: catalog.summary.generatedAssetCount,
  excludedRenderFailures: catalog.summary.renderFailuresExcluded,
  mocFilesUsed: catalog.summary.mocFilesUsed,
}));
