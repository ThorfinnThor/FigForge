import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { catalogPackageSchema, type CatalogRole } from "../src/contracts/catalog-package.js";
import {
  renderLDrawCatalogCoverageMarkdown,
  type LDrawCatalogCoverageReport,
} from "./lib/ldraw-catalog-coverage.js";

const root = process.cwd();
const sourcePolicy = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.";
const generatedPath = resolve(root, "data/generated/ldraw-catalog-coverage.json");
const markdownPath = resolve(root, "docs/ldraw-catalog-coverage.md");
const packageFiles = [
  ["head", "head.json"],
  ["headwear", "headwear.json"],
  ["torsoAssembly", "torso-assembly.json"],
  ["legsAssembly", "legs-assembly.json"],
  ["handAccessory", "hand-accessory.json"],
] as const satisfies ReadonlyArray<readonly [CatalogRole, string]>;
const classifications = [
  "builder-blocked",
  "render-failed",
  "placement-profile-required",
  "reviewed-incompatible-assembly",
  "ambiguous-official-mapping",
  "no-official-mapping",
] as const;

const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(path, "utf8")) as T;
const normalize = (value: string): string => value.trim().toLowerCase();
const catalogKey = (role: CatalogRole, partNum: string): string => `${role}:${normalize(partNum)}`;
const emptyCounts = (): Record<(typeof classifications)[number], number> => Object.fromEntries(
  classifications.map((classification) => [classification, 0]),
) as Record<(typeof classifications)[number], number>;

const report = await readJson<LDrawCatalogCoverageReport>(generatedPath);
const manifest = await readJson<{
  sourcePolicy: string;
  sourceLockSha256: string;
  includedPartCount: number;
}>(resolve(root, "data/generated/catalog-packages/manifest.json"));
const ldrawLock = await readJson<{
  sourcePolicy: string;
  library: string;
  release: string;
  archiveSha256: string;
  contentPolicy: string;
}>(resolve(root, "data/ldraw-source.lock.json"));
const expanded = await readJson<{
  entries: Array<{ role: CatalogRole; rebrickablePartNum: string }>;
  renderFailures: Array<{ rebrickablePartNum: string; ldrawFile: string; reason: string }>;
}>(resolve(root, "data/generated/ldraw-expanded-catalog.json"));
const thumbnails = await readJson<{
  entries: Array<{ status: "verified" | "blocked" }>;
}>(resolve(root, "data/generated/ldraw-catalog-thumbnails.json"));
const assortment = await readJson<{
  components: Array<{ id: string; role: CatalogRole; rebrickablePartNum: string }>;
}>(resolve(root, "data/curated/ff03-test-assortment.json"));
const connectivity = await readJson<{
  entries: Array<{
    componentId: string;
    status: "digitally-supported" | "blocked";
    reasonCode?: string;
    note?: string;
  }>;
}>(resolve(root, "data/generated/ldraw-digital-connectivity.json"));

assert.equal(report.schemaVersion, 1);
assert.equal(report.sourcePolicy, sourcePolicy);
assert.equal(manifest.sourcePolicy, sourcePolicy);
assert.equal(ldrawLock.sourcePolicy, sourcePolicy);
assert.match(ldrawLock.contentPolicy, /MOC files are excluded/u);
assert.equal(report.sources.catalogSourceLockSha256, manifest.sourceLockSha256);
assert.equal(report.sources.ldrawLibrary, ldrawLock.library);
assert.equal(report.sources.ldrawRelease, ldrawLock.release);
assert.equal(report.sources.ldrawArchiveSha256, ldrawLock.archiveSha256);
assert.equal(report.sources.mocFilesUsed, 0);
assert(report.sources.officialTopLevelPartFiles > 20_000);

const curatedById = new Map(assortment.components.map((component) => [component.id, component]));
const builderReadyKeys = new Set(expanded.entries.map((entry) => catalogKey(entry.role, entry.rebrickablePartNum)));
const blockedKeys = new Set<string>();
for (const entry of connectivity.entries) {
  const component = curatedById.get(entry.componentId);
  assert(component, `Unknown connectivity component: ${entry.componentId}`);
  const key = catalogKey(component.role, component.rebrickablePartNum);
  if (entry.status === "digitally-supported") builderReadyKeys.add(key);
  else blockedKeys.add(key);
}
const renderFailureIdentities = new Set(expanded.renderFailures.map((failure) =>
  `${normalize(failure.rebrickablePartNum)}:${failure.ldrawFile.toLowerCase()}`
));

const remainingByKey = new Map(report.remainingEntries.map((entry) => [
  catalogKey(entry.role, entry.rebrickablePartNum),
  entry,
]));
assert.equal(remainingByKey.size, report.remainingEntries.length, "Duplicate remaining coverage entry");

const catalogKeys = new Set<string>();
const actualClassifications = emptyCounts();
const roleCounts = Object.fromEntries(packageFiles.map(([role]) => [role, {
  catalogPartCount: 0,
  builderReadyPartCount: 0,
  remainingCatalogPartCount: 0,
  remainingClassifications: emptyCounts(),
}])) as LDrawCatalogCoverageReport["roles"];

for (const [role, fileName] of packageFiles) {
  const catalogPackage = catalogPackageSchema.parse(await readJson<unknown>(
    resolve(root, "data/generated/catalog-packages", fileName),
  ));
  for (const part of catalogPackage.parts) {
    const key = catalogKey(role, part.rebrickablePartNum);
    assert(!catalogKeys.has(key), `Duplicate catalog key: ${key}`);
    catalogKeys.add(key);
    roleCounts[role].catalogPartCount += 1;
    const remaining = remainingByKey.get(key);
    if (builderReadyKeys.has(key)) {
      assert.equal(remaining, undefined, `Builder-ready part appears in remaining report: ${key}`);
      roleCounts[role].builderReadyPartCount += 1;
      continue;
    }
    assert(remaining, `Missing remaining coverage entry: ${key}`);
    assert.equal(remaining.catalogId, part.id);
    assert.equal(remaining.name, part.name);
    assert(classifications.includes(remaining.classification));
    assert(remaining.ldrawFiles.every((file) => file.startsWith("parts/") && !file.toLowerCase().includes("moc")));
    roleCounts[role].remainingCatalogPartCount += 1;
    roleCounts[role].remainingClassifications[remaining.classification] += 1;
    actualClassifications[remaining.classification] += 1;

    if (remaining.classification === "builder-blocked") {
      assert(blockedKeys.has(key), `Unexpected builder-blocked entry: ${key}`);
      assert(remaining.reason);
    } else if (remaining.classification === "render-failed") {
      assert.equal(remaining.ldrawFiles.length, 1);
      assert(renderFailureIdentities.has(`${normalize(remaining.rebrickablePartNum)}:${remaining.ldrawFiles[0]?.toLowerCase()}`));
      assert(remaining.reason);
    } else if (remaining.classification === "placement-profile-required") {
      assert.equal(remaining.ldrawFiles.length, 1);
      assert.equal(remaining.reason, null);
    } else if (remaining.classification === "reviewed-incompatible-assembly") {
      assert.equal(remaining.ldrawFiles.length, 1);
      assert.match(remaining.reason ?? "", /^not-a-complete-compatible-role-assembly:/u);
      assert.notEqual(remaining.role, "handAccessory");
    } else if (remaining.classification === "ambiguous-official-mapping") {
      assert(remaining.ldrawFiles.length > 1);
      assert.equal(remaining.reason, null);
    } else {
      assert.equal(remaining.ldrawFiles.length, 0);
      assert.equal(remaining.reason, null);
    }
  }
}

assert.equal(catalogKeys.size, manifest.includedPartCount);
assert.equal(report.summary.catalogPartCount, catalogKeys.size);
assert.equal(report.summary.builderReadyPartCount, builderReadyKeys.size);
assert.equal(report.summary.remainingCatalogPartCount, report.remainingEntries.length);
assert.equal(report.summary.builderReadyPartCount + report.summary.remainingCatalogPartCount, report.summary.catalogPartCount);
assert.equal(
  report.summary.visualizedPartCount,
  expanded.entries.length + thumbnails.entries.filter(({ status }) => status === "verified").length,
);
assert.equal(report.summary.remainingWithoutVisualizationCount, report.summary.catalogPartCount - report.summary.visualizedPartCount);
assert.equal(
  report.summary.uniqueOfficialMappingCount + report.summary.ambiguousOfficialMappingCount + report.summary.noOfficialMappingCount,
  report.summary.catalogPartCount,
);
assert.deepEqual(report.summary.remainingClassifications, actualClassifications);
assert.deepEqual(report.roles, roleCounts);
assert.deepEqual(new Set(report.remainingEntries.filter(({ classification }) => classification === "builder-blocked").map((entry) => catalogKey(entry.role, entry.rebrickablePartNum))), blockedKeys);
assert.equal(await readFile(markdownPath, "utf8"), renderLDrawCatalogCoverageMarkdown(report));

console.log(JSON.stringify({
  message: "official LDraw catalog coverage report valid",
  ...report.summary,
}));
