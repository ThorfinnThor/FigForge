import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { LDrawCatalogCoverageReport } from "./lib/ldraw-catalog-coverage.js";
import type { LDrawPlacementCandidateReport } from "./lib/ldraw-placement-candidates.js";

const root = process.cwd();
const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, "utf8")) as T;
const report = await readJson<LDrawPlacementCandidateReport>(
  resolve(root, "data/generated/ldraw-placement-candidates.json"),
);
const coverage = await readJson<LDrawCatalogCoverageReport>(
  resolve(root, "data/generated/ldraw-catalog-coverage.json"),
);
const key = (entry: { role: string; rebrickablePartNum: string }): string =>
  `${entry.role}:${entry.rebrickablePartNum.toLowerCase()}`;

assert.equal(report.schemaVersion, 1);
assert.equal(report.sourcePolicy, "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.");
assert.deepEqual(report.sources, coverage.sources);
assert.equal(report.execution.rebrickableApiUsed, false);
assert.equal(report.execution.mocFilesUsed, 0);
assert.equal(report.execution.automaticBuilderEnablements, 0);
assert.equal(report.sourceQueue.retryPolicy, "re-run-after-locked-catalog-or-official-ldraw-update");

const expectedPlacement = coverage.remainingEntries.filter(({ classification }) =>
  classification === "placement-profile-required"
);
const expectedNoMapping = coverage.remainingEntries.filter(({ classification }) =>
  classification === "no-official-mapping"
);
const expectedAmbiguous = coverage.remainingEntries.filter(({ classification }) =>
  classification === "ambiguous-official-mapping"
);
assert.deepEqual(new Set(report.placementCandidates.map(key)), new Set(expectedPlacement.map(key)));
assert.deepEqual(new Set(report.sourceQueue.noOfficialMapping.map(key)), new Set(expectedNoMapping.map(key)));
assert.deepEqual(new Set(report.sourceQueue.ambiguousOfficialMapping.map(key)), new Set(expectedAmbiguous.map(key)));
assert.equal(report.summary.placementProfileRequiredCount, report.placementCandidates.length);
assert.equal(report.summary.noOfficialMappingQueueCount, report.sourceQueue.noOfficialMapping.length);
assert.equal(report.summary.ambiguousOfficialMappingQueueCount, report.sourceQueue.ambiguousOfficialMapping.length);

const analyses = new Map<string, number>();
for (const entry of report.placementCandidates) {
  assert.equal(entry.automaticBuilderEnablement, false);
  assert(entry.ldrawFiles.every((file) => file.startsWith("parts/") && !file.toLowerCase().includes("moc")));
  assert(!entry.analysis.toLowerCase().includes("builder-ready"));
  assert(!entry.analysis.toLowerCase().includes("verified"));
  if (entry.analysis === "unique-radius-4-cylinder-candidate") {
    assert.equal(entry.evidence.length, 1);
    assert.equal(entry.proposedPlacementTransformLdu?.length, 16);
    assert(entry.proposedPlacementTransformLdu?.every(Number.isFinite));
  } else {
    assert.equal(entry.proposedPlacementTransformLdu, null);
  }
  analyses.set(entry.analysis, (analyses.get(entry.analysis) ?? 0) + 1);
}
assert.equal(report.summary.uniqueRadius4CandidateCount, analyses.get("unique-radius-4-cylinder-candidate") ?? 0);
assert.equal(report.summary.multipleRadius4CandidateCount, analyses.get("multiple-radius-4-cylinder-candidates") ?? 0);
assert.equal(report.summary.noRadius4CylinderDetectedCount, analyses.get("no-radius-4-cylinder-detected") ?? 0);
assert.equal(report.summary.roleSpecificAssemblyProfileRequiredCount, analyses.get("role-specific-assembly-profile-required") ?? 0);
assert.equal(
  report.summary.uniqueRadius4CandidateCount
    + report.summary.multipleRadius4CandidateCount
    + report.summary.noRadius4CylinderDetectedCount
    + report.summary.roleSpecificAssemblyProfileRequiredCount,
  report.summary.placementProfileRequiredCount,
);

console.log(JSON.stringify({ message: "LDraw placement candidate report valid", ...report.summary }));
