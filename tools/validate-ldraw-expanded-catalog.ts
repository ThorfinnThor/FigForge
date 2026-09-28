import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const root = process.cwd();
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
    mappingEvidence: string;
    modelUrl: string;
    modelSha256: string;
    thumbnailUrl: string;
    thumbnailSha256: string;
    thumbnailBytes: number;
    previewColorRgb: string;
    placementMode: string;
    placementTransformLdu: number[];
    geometryFallback: null | { kind: string; parentPartNums: string[] };
  }>;
  summary: {
    digitallySupportedCount: number;
    headCount: number;
    headwearCount: number;
    torsoAssemblyCount: number;
    legsAssemblyCount: number;
    directMappingCount: number;
    printParentGeometryFallbackCount: number;
    generatedAssetCount: number;
    sharedOfficialFileCount: number;
    renderFailuresExcluded: number;
    mocFilesUsed: number;
  };
};

assert.equal(catalog.sourcePolicy, "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.");
assert.equal(catalog.sourcePolicy, lock.sourcePolicy);
assert.equal(catalog.source.release, lock.release);
assert.equal(catalog.source.archiveSha256, lock.archiveSha256);
assert.equal(catalog.source.noticePath, lock.noticePath);
assert.match(lock.contentPolicy, /MOC files are excluded/u);
assert.equal(catalog.summary.mocFilesUsed, 0);
assert.equal(catalog.entries.length, catalog.summary.digitallySupportedCount);
assert.equal(catalog.summary.headCount + catalog.summary.headwearCount + catalog.summary.torsoAssemblyCount + catalog.summary.legsAssemblyCount, catalog.entries.length);
assert(catalog.entries.length >= 800, "Expanded catalog unexpectedly dropped below 800 renderable parts");

const publicLDrawRoot = resolve(root, "public/assets/ldraw/official-2608");
const fileMap = JSON.parse(await readFile(resolve(publicLDrawRoot, "file-map.json"), "utf8")) as Record<string, unknown>;
const fileMapEntries = Object.entries(fileMap);
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
  parts: Array<{ partNum: string; printParentPartNums: string[] }>;
};
const normalizedByPartNum = new Map(normalizedCatalog.parts.map((part) => [part.partNum.toLowerCase(), part]));
for (const entry of catalog.entries) {
  assert(!ids.has(entry.componentId), `Duplicate component ID: ${entry.componentId}`);
  ids.add(entry.componentId);
  assert.equal(entry.status, "verified");
  assert(["head", "headwear", "torsoAssembly", "legsAssembly"].includes(entry.role));
  assert(entry.componentId.startsWith(`catalog:${entry.role}:`));
  assert(entry.ldrawFile.startsWith("parts/"));
  assert(!entry.ldrawFile.toLowerCase().includes("moc"));
  assert(["exact-filename", "explicit-keyword", "rebrickable-print-parent"].includes(entry.mappingEvidence));
  const isPrintParentFallback = entry.mappingEvidence === "rebrickable-print-parent";
  if (isPrintParentFallback) {
    assert.equal(entry.geometryFallback?.kind, "unprinted-print-parent");
    assert(entry.geometryFallback.parentPartNums.length > 0);
    const normalizedPart = normalizedByPartNum.get(entry.rebrickablePartNum.toLowerCase());
    assert(normalizedPart, `Missing normalized catalog part: ${entry.rebrickablePartNum}`);
    assert(entry.geometryFallback.parentPartNums.every((parent) => normalizedPart.printParentPartNums.includes(parent)));
  } else {
    assert.equal(entry.geometryFallback, null);
  }
  assert.equal(entry.placementMode, "prototype-family-origin");
  assert.equal(entry.placementTransformLdu.length, 16);
  assert(entry.placementTransformLdu.every(Number.isFinite));
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
    assert(isPrintParentFallback, `Direct mapping reuses model URL: ${entry.modelUrl}`);
    assert.deepEqual(assetIdentity, existingAsset, `Inconsistent shared geometry asset: ${entry.modelUrl}`);
    continue;
  }
  assetsByModelUrl.set(entry.modelUrl, assetIdentity);

  const model = await readFile(resolve(root, `public${entry.modelUrl}`));
  const thumbnail = await readFile(resolve(root, `public${entry.thumbnailUrl}`));
  assert.equal(sha256(model), entry.modelSha256, `Model hash mismatch: ${entry.componentId}`);
  assert(fileMap[basename(entry.ldrawFile)], `Mapped part is missing from the browser file map: ${entry.ldrawFile}`);
  assert.equal(sha256(thumbnail), entry.thumbnailSha256, `Thumbnail hash mismatch: ${entry.componentId}`);
  assert.equal(thumbnail.byteLength, entry.thumbnailBytes, `Thumbnail byte count mismatch: ${entry.componentId}`);
  assert(thumbnail.byteLength <= 10_000, `Thumbnail budget exceeded: ${entry.componentId}`);
  assert.equal(thumbnail.subarray(0, 4).toString("hex"), "52494646", `Thumbnail is not WebP/RIFF: ${entry.componentId}`);
  const officialPart = await readFile(resolve(root, "public/assets/ldraw/official-2608/parts", basename(entry.ldrawFile)), "utf8");
  assert(/!LDRAW_ORG (?:Part|Shortcut)\b/u.test(officialPart), `Mapped file is not an official LDraw part: ${entry.ldrawFile}`);
}
assert.equal(catalog.summary.directMappingCount + catalog.summary.printParentGeometryFallbackCount, catalog.entries.length);
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
  printParentGeometryFallbacks: catalog.summary.printParentGeometryFallbackCount,
  generatedAssets: catalog.summary.generatedAssetCount,
  excludedRenderFailures: catalog.summary.renderFailuresExcluded,
  mocFilesUsed: catalog.summary.mocFilesUsed,
}));
