import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizedCatalogSchema } from "../src/contracts/catalog-refresh.js";
import { sourceLockSchema } from "../src/contracts/source-lock.js";

const generatedDir = resolve(process.cwd(), "data/generated");
const lockPath = resolve(generatedDir, "catalog-source.lock.json");
const catalogPath = resolve(generatedDir, "catalog-normalized.json");

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

console.log(JSON.stringify({ message: "generated catalog valid", generated: true, partCount: catalog.parts.length, artifactCount: catalog.artifacts.length, apiUsed: false, mocFilesAllowed: false }));
