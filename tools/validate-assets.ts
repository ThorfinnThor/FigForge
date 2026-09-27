import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { anchorRegistrySchema } from "../src/contracts/anchor-registry.js";
import { modelPackageIndexSchema, fixturePackageSchema } from "../src/contracts/model-package.js";
import { sourceLockSchema } from "../src/contracts/source-lock.js";
import { testAssortmentSchema } from "../src/contracts/test-assortment.js";
import { buildFixtureModelPackage } from "./assets/fixture-model-package.js";

const readJson = async (relativePath: string): Promise<unknown> =>
  JSON.parse(await readFile(resolve(process.cwd(), relativePath), "utf8")) as unknown;
const sha256 = (content: string): string => createHash("sha256").update(content, "utf8").digest("hex");
const bytes = (content: string): number => Buffer.byteLength(content, "utf8");

const assortmentContent = await readFile(resolve(process.cwd(), "data/curated/ff03-test-assortment.json"), "utf8");
const sourceLockContent = await readFile(resolve(process.cwd(), "data/sources.lock.json"), "utf8");
const anchorContent = await readFile(resolve(process.cwd(), "data/curated/ff05-anchor-registry.json"), "utf8");
const assortment = testAssortmentSchema.parse(JSON.parse(assortmentContent) as unknown);
const sourceLock = sourceLockSchema.parse(JSON.parse(sourceLockContent) as unknown);
const anchorRegistry = anchorRegistrySchema.parse(JSON.parse(anchorContent) as unknown);
const index = modelPackageIndexSchema.parse(await readJson("data/generated/model-packages.json"));
const packageContent = await readFile(resolve(process.cwd(), `public${index.package.url}`), "utf8");
const packageData = fixturePackageSchema.parse(JSON.parse(packageContent) as unknown);
const expected = buildFixtureModelPackage({
  assortment,
  anchorRegistry,
  assortmentSha256: sha256(assortmentContent),
  sourceLockSha256: sha256(sourceLockContent),
  anchorRegistrySha256: sha256(anchorContent),
});

assert.equal(sourceLock.sources[0].apiUsed, false, "FF-10 must not use the Rebrickable API");
assert.equal(anchorRegistry.publishable, false, "FF-10 fixture anchors must remain non-publishable");
assert.equal(packageContent, expected.packageContent, "Model package bytes are not reproducible");
assert.deepEqual(index, expected.index, "Model package index is stale or non-deterministic");
assert.deepEqual(packageData, expected.package, "Model package schema differs from the deterministic builder");
assert(!packageContent.toLowerCase().includes("/api/"), "API URLs are forbidden in model packages");
assert(!packageContent.toLowerCase().includes(".moc"), "MOC files are forbidden in model packages");
assert.equal(index.package.publishable, false);
assert.equal(index.summary.publishablePackageCount, 0);

for (const thumbnail of index.thumbnails) {
  const content = expected.thumbnailContents.get(thumbnail.url);
  assert.notEqual(content, undefined, `Missing deterministic thumbnail content for ${thumbnail.id}`);
  const actual = await readFile(resolve(process.cwd(), `public${thumbnail.url}`), "utf8");
  assert.equal(actual, content, `Thumbnail bytes are not reproducible: ${thumbnail.id}`);
  assert.equal(sha256(actual), thumbnail.sha256, `Thumbnail hash mismatch: ${thumbnail.id}`);
  assert.equal(bytes(actual), thumbnail.bytes, `Thumbnail byte count mismatch: ${thumbnail.id}`);
  assert(thumbnail.bytes <= index.summary.maxThumbnailBytes, `Thumbnail budget exceeded: ${thumbnail.id}`);
  assert(!actual.toLowerCase().includes("/api/"), `API URL found in thumbnail: ${thumbnail.id}`);
  assert(!actual.toLowerCase().includes(".moc"), `MOC reference found in thumbnail: ${thumbnail.id}`);
}

console.log(JSON.stringify({ message: "FF-10 model package and thumbnails valid", ...index.summary }));
