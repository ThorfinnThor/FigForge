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
    placementMode: string;
    placementTransformLdu: number[];
  }>;
  summary: {
    digitallySupportedCount: number;
    headCount: number;
    headwearCount: number;
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
assert.equal(catalog.summary.headCount + catalog.summary.headwearCount, catalog.entries.length);
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
const urls = new Set<string>();
for (const entry of catalog.entries) {
  assert(!ids.has(entry.componentId), `Duplicate component ID: ${entry.componentId}`);
  ids.add(entry.componentId);
  assert.equal(entry.status, "verified");
  assert(["head", "headwear"].includes(entry.role));
  assert(entry.componentId.startsWith(`catalog:${entry.role}:`));
  assert(entry.ldrawFile.startsWith("parts/"));
  assert(!entry.ldrawFile.toLowerCase().includes("moc"));
  assert(["exact-filename", "explicit-keyword"].includes(entry.mappingEvidence));
  assert.equal(entry.placementMode, "prototype-family-origin");
  assert.equal(entry.placementTransformLdu.length, 16);
  assert(entry.placementTransformLdu.every(Number.isFinite));
  assert(!urls.has(entry.modelUrl), `Duplicate model URL: ${entry.modelUrl}`);
  urls.add(entry.modelUrl);

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
  excludedRenderFailures: catalog.summary.renderFailuresExcluded,
  mocFilesUsed: catalog.summary.mocFilesUsed,
}));
