import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { semanticSearchReleaseSchema } from "../src/contracts/semantic-search-release.js";

const root = process.cwd();
const sha256 = (content: Uint8Array): string => createHash("sha256").update(content).digest("hex");
const generated = semanticSearchReleaseSchema.parse(JSON.parse(await readFile(resolve(root, "data/generated/semantic-search-release.json"), "utf8")));
const published = semanticSearchReleaseSchema.parse(JSON.parse(await readFile(resolve(root, "public/search/compact-minilm/manifest.json"), "utf8")));
const orderedComponentIds = JSON.parse(await readFile(
  resolve(root, "public/search/compact-minilm/ordered-component-ids.json"),
  "utf8",
)) as string[];
assert.deepEqual(published, generated);
let bytes = 0;
for (const asset of published.assets) {
  const content = await readFile(resolve(root, `public${asset.url}`));
  assert.equal(content.byteLength, asset.byteLength, `${asset.url}: byte length`);
  assert.equal(sha256(content), asset.sha256, `${asset.url}: sha256`);
  bytes += content.byteLength;
}
assert.equal(bytes, published.requiredDownloadBytes);
assert.equal(published.documentCount, orderedComponentIds.length);
assert.equal(new Set(orderedComponentIds).size, orderedComponentIds.length);
assert.equal(published.indexSha256, published.assets.find(({ kind }) => kind === "index")?.sha256);
console.log(JSON.stringify({ message: "semantic search release valid", documentCount: published.documentCount, requiredDownloadBytes: bytes }));
