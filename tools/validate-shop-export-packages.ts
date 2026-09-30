import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildShopExportPackages, SHOP_EXPORT_DIRECTORY } from "./lib/shop-export-packages.js";

const root = process.cwd();
const expected = await buildShopExportPackages(root);
const directory = resolve(root, SHOP_EXPORT_DIRECTORY);
const actualFiles = (await readdir(directory)).sort();
assert.deepEqual(actualFiles, [...expected.keys()].sort(), "Shop export directory has unexpected files");
for (const [fileName, content] of expected) {
  const actual = await readFile(resolve(directory, fileName), "utf8");
  assert.equal(actual, content, `${fileName} is stale; run npm run assets:shop-export`);
}
console.log(JSON.stringify({ message: "Shop export packages match the normalized catalog", files: actualFiles.length }));
