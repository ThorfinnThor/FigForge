import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildLDrawCatalogCoverage,
  renderLDrawCatalogCoverageMarkdown,
} from "./lib/ldraw-catalog-coverage.js";

const root = process.cwd();
const libraryArgument = process.argv.find((argument) => argument.startsWith("--library="));
const libraryRoot = libraryArgument
  ? resolve(libraryArgument.slice("--library=".length))
  : resolve(root, "data/incoming/ldraw-2608/extracted/ldraw");
const outputPath = resolve(root, "data/generated/ldraw-catalog-coverage.json");
const reportPath = resolve(root, "docs/ldraw-catalog-coverage.md");

const report = await buildLDrawCatalogCoverage(root, libraryRoot);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(reportPath, renderLDrawCatalogCoverageMarkdown(report), "utf8");

console.log(JSON.stringify({
  message: "official LDraw catalog coverage analyzed",
  output: "data/generated/ldraw-catalog-coverage.json",
  report: "docs/ldraw-catalog-coverage.md",
  ...report.summary,
}));
