import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { corePackageSchema } from "../src/contracts/core-package.js";
import { CATALOG_PACKAGE_FILE_BY_ROLE } from "./catalog/build-catalog-packages.js";
import { buildCorePackages, CORE_PACKAGE_DIRECTORY } from "./lib/core-packages.js";

const root = process.cwd();
const expected = await buildCorePackages(root);
const summary: Array<{ role: string; partCount: number; bytes: number }> = [];
for (const [role, file] of Object.entries(CATALOG_PACKAGE_FILE_BY_ROLE)) {
  const content = await readFile(resolve(root, CORE_PACKAGE_DIRECTORY, file), "utf8");
  const actual = corePackageSchema.parse(JSON.parse(content) as unknown);
  assert.deepEqual(
    actual,
    expected[role as keyof typeof expected],
    `Core package ${role} is stale; run npm run data:build:core-packages`,
  );
  summary.push({ role, partCount: actual.catalog.parts.length, bytes: content.length });
}
console.log(JSON.stringify({ message: "core packages valid", packages: summary }));
