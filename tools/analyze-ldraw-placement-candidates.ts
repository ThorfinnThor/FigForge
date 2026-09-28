import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { LDrawCatalogCoverageReport } from "./lib/ldraw-catalog-coverage.js";
import { buildLDrawPlacementCandidateReport } from "./lib/ldraw-placement-candidates.js";

const root = process.cwd();
const libraryArgument = process.argv.find((argument) => argument.startsWith("--library="));
const libraryRoot = libraryArgument
  ? resolve(libraryArgument.slice("--library=".length))
  : resolve(root, "data/incoming/ldraw-2608/extracted/ldraw");
const coveragePath = resolve(root, "data/generated/ldraw-catalog-coverage.json");
const outputPath = resolve(root, "data/generated/ldraw-placement-candidates.json");

const coverage = JSON.parse(await readFile(coveragePath, "utf8")) as LDrawCatalogCoverageReport;
const report = await buildLDrawPlacementCandidateReport(coverage, libraryRoot);
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  message: "official LDraw placement candidates analyzed without automatic enablement",
  output: "data/generated/ldraw-placement-candidates.json",
  ...report.summary,
}));
