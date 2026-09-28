import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizedCatalogSchema } from "../src/contracts/catalog-refresh.js";
import {
  buildCatalogPackages,
  CATALOG_PACKAGE_FILE_BY_ROLE,
} from "./catalog/build-catalog-packages.js";

const generatedDir = resolve(process.cwd(), "data/generated");
const catalog = normalizedCatalogSchema.parse(
  JSON.parse(await readFile(resolve(generatedDir, "catalog-normalized.json"), "utf8")) as unknown,
);
const result = buildCatalogPackages(catalog);
const outputDir = resolve(generatedDir, "catalog-packages");

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "manifest.json"), `${JSON.stringify(result.manifest, null, 2)}\n`, "utf8");
for (const [role, catalogPackage] of Object.entries(result.packages)) {
  await writeFile(
    resolve(outputDir, CATALOG_PACKAGE_FILE_BY_ROLE[role as keyof typeof CATALOG_PACKAGE_FILE_BY_ROLE]),
    `${JSON.stringify(catalogPackage)}\n`,
    "utf8",
  );
}

console.log(JSON.stringify({
  message: "browser catalog packages built",
  includedPartCount: result.manifest.includedPartCount,
  packageCount: result.manifest.packages.length,
  sourcePolicy: result.manifest.sourcePolicy,
}));
