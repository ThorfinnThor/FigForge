import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  catalogPackageManifestSchema,
  catalogPackageSchema,
} from "../src/contracts/catalog-package.js";
import { normalizedCatalogSchema } from "../src/contracts/catalog-refresh.js";
import { sourceLockSchema } from "../src/contracts/source-lock.js";

const generatedDir = resolve(process.cwd(), "data/generated");
const lockPath = resolve(generatedDir, "catalog-source.lock.json");
const catalogPath = resolve(generatedDir, "catalog-normalized.json");
const catalogPackagesDir = resolve(generatedDir, "catalog-packages");

try {
  await access(lockPath);
  await access(catalogPath);
} catch {
  console.log(JSON.stringify({ message: "no generated catalog present; validation skipped", generated: false }));
  process.exit(0);
}

const lockRaw = await readFile(lockPath, "utf8");
const lock = sourceLockSchema.parse(JSON.parse(lockRaw) as unknown);
const catalog = normalizedCatalogSchema.parse(JSON.parse(await readFile(catalogPath, "utf8")) as unknown);
const canonicalLock = `${JSON.stringify(lock, null, 2)}\n`;
const lockSha256 = createHash("sha256").update(canonicalLock).digest("hex");
assert.equal(catalog.sourceLockSha256, lockSha256, "Normalized catalog is not locked to its generated source lock");
assert.equal(catalog.sourcePolicy, "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.");
assert.equal(lock.sources[0].apiUsed, false);

const lockedHashes = new Map(lock.sources[0].artifacts.map((artifact) => [artifact.fileName, artifact.sha256]));
for (const artifact of catalog.artifacts) {
  assert.equal(artifact.sha256, lockedHashes.get(artifact.fileName), `Generated hash mismatch for ${artifact.fileName}`);
}

const packageManifest = catalogPackageManifestSchema.parse(
  JSON.parse(await readFile(resolve(catalogPackagesDir, "manifest.json"), "utf8")) as unknown,
);
assert.equal(packageManifest.sourceLockSha256, catalog.sourceLockSha256);
const packagedPartIds = new Set<string>();
for (const manifestEntry of packageManifest.packages) {
  const catalogPackage = catalogPackageSchema.parse(
    JSON.parse(await readFile(resolve(catalogPackagesDir, manifestEntry.fileName), "utf8")) as unknown,
  );
  assert.equal(catalogPackage.role, manifestEntry.role);
  assert.equal(catalogPackage.sourceLockSha256, catalog.sourceLockSha256);
  assert.deepEqual(catalogPackage.categoryIds, manifestEntry.categoryIds);
  assert.equal(catalogPackage.parts.length, manifestEntry.partCount);
  for (const part of catalogPackage.parts) {
    assert.equal(packagedPartIds.has(part.id), false, `Catalog package contains duplicate part ${part.id}`);
    packagedPartIds.add(part.id);
  }
}
assert.equal(packagedPartIds.size, packageManifest.includedPartCount);

console.log(JSON.stringify({ message: "generated catalog valid", generated: true, partCount: catalog.parts.length, packagedMinifigPartCount: packageManifest.includedPartCount, artifactCount: catalog.artifacts.length, apiUsed: false, mocFilesAllowed: false }));
