import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { catalogPackageSchema, type CatalogRole } from "../src/contracts/catalog-package.js";
import {
  ambiguousMappingKey,
  readAmbiguousMappingResolutions,
} from "./lib/ldraw-ambiguous-mapping-resolutions.js";

const root = process.cwd();
const resolutions = await readAmbiguousMappingResolutions(root);
const packages = [
  ["head", "head.json"],
  ["headwear", "headwear.json"],
  ["torsoAssembly", "torso-assembly.json"],
  ["legsAssembly", "legs-assembly.json"],
  ["handAccessory", "hand-accessory.json"],
] as const satisfies ReadonlyArray<readonly [CatalogRole, string]>;

const catalogNames = new Map<string, string>();
for (const [role, file] of packages) {
  const source: unknown = JSON.parse(await readFile(resolve(root, "data/generated/catalog-packages", file), "utf8"));
  const catalogPackage = catalogPackageSchema.parse(source);
  for (const part of catalogPackage.parts) {
    catalogNames.set(ambiguousMappingKey(role, part.rebrickablePartNum), part.name);
  }
}

const expanded = JSON.parse(await readFile(resolve(root, "data/generated/ldraw-expanded-catalog.json"), "utf8")) as {
  entries: Array<{
    role: CatalogRole;
    rebrickablePartNum: string;
    mappingEvidence: string;
    geometryFallback: unknown;
  }>;
};
const expandedByKey = new Map(expanded.entries.map((entry) => [
  ambiguousMappingKey(entry.role, entry.rebrickablePartNum),
  entry,
]));
const compositionDocument = JSON.parse(await readFile(resolve(root, "data/generated/ldraw-assembly-compositions.json"), "utf8")) as {
  compositions: Record<string, { components: Array<{ file: string }> }>;
};
const coverage = JSON.parse(await readFile(resolve(root, "data/generated/ldraw-catalog-coverage.json"), "utf8")) as {
  remainingEntries: Array<{
    role: CatalogRole;
    rebrickablePartNum: string;
    classification: string;
    ldrawFiles: string[];
  }>;
};
const remainingByKey = new Map(coverage.remainingEntries.map((entry) => [
  ambiguousMappingKey(entry.role, entry.rebrickablePartNum),
  entry,
]));
const placement = JSON.parse(await readFile(resolve(root, "data/generated/ldraw-placement-candidates.json"), "utf8")) as {
  summary: { ambiguousOfficialMappingQueueCount: number };
  sourceQueue: { ambiguousOfficialMapping: Array<{ role: CatalogRole; rebrickablePartNum: string }> };
};
const ambiguousKeys = new Set(placement.sourceQueue.ambiguousOfficialMapping.map((entry) =>
  ambiguousMappingKey(entry.role, entry.rebrickablePartNum)
));

const adjudicatedKeys = new Set<string>();
const record = (role: CatalogRole, partNum: string, catalogName: string): string => {
  const key = ambiguousMappingKey(role, partNum);
  assert(!adjudicatedKeys.has(key), `Duplicate ambiguous mapping adjudication: ${key}`);
  adjudicatedKeys.add(key);
  assert.equal(catalogNames.get(key), catalogName, `Catalog name changed for ${key}`);
  return key;
};

for (const selection of resolutions.selections) {
  const key = record(selection.role, selection.rebrickablePartNum, selection.catalogName);
  assert(selection.selectedFile.startsWith("parts/") && !selection.selectedFile.toLowerCase().includes("moc"));
  assert(selection.reason.length >= 20);
  assert(!ambiguousKeys.has(key), `Selected mapping remains ambiguous: ${key}`);
  const output = expandedByKey.get(key);
  const remaining = remainingByKey.get(key);
  assert(output || remaining?.classification === "placement-profile-required", `Selected mapping was not processed: ${key}`);
  if (output) {
    assert.equal(output.mappingEvidence, "curated-official-metadata");
    const officialSource = await readFile(resolve(root, "public/assets/ldraw/official-2608", selection.selectedFile), "utf8");
    assert.equal((officialSource.split(/\r?\n/u)[0] ?? "").replace(/^0\s+/u, ""), selection.officialDescription);
  }
  if (remaining) assert.deepEqual(remaining.ldrawFiles, [selection.selectedFile]);
}

for (const assembly of resolutions.assemblies) {
  const key = record(assembly.role, assembly.rebrickablePartNum, assembly.catalogName);
  assert(assembly.reason.length >= 20);
  assert(!ambiguousKeys.has(key), `Composed mapping remains ambiguous: ${key}`);
  const output = expandedByKey.get(key);
  assert(output, `Composed mapping is not builder-ready: ${key}`);
  assert.equal(output.mappingEvidence, "rebrickable-assembly-code");
  assert.equal(output.geometryFallback, null);
  const composition = compositionDocument.compositions[`catalog:${assembly.role}:${assembly.rebrickablePartNum.toLowerCase()}`];
  assert(composition, `Missing assembly composition: ${key}`);
  const actualFiles = new Set(composition.components.map(({ file }) => file));
  for (const file of assembly.componentFiles) assert(actualFiles.has(file), `Missing ${file} in ${key}`);
}

for (const blocked of resolutions.blocked) {
  const key = record(blocked.role, blocked.rebrickablePartNum, blocked.catalogName);
  assert(blocked.reason.length >= 20);
  assert(ambiguousKeys.has(key), `Blocked mapping is no longer ambiguous: ${key}`);
}

assert.equal(adjudicatedKeys.size, 34);
assert.equal(resolutions.selections.length, 18);
assert.equal(resolutions.assemblies.length, 3);
assert.equal(resolutions.blocked.length, 13);
assert.equal(placement.summary.ambiguousOfficialMappingQueueCount, 13);
assert.deepEqual(ambiguousKeys, new Set(resolutions.blocked.map((entry) =>
  ambiguousMappingKey(entry.role, entry.rebrickablePartNum)
)));

console.log(JSON.stringify({
  message: "ambiguous official LDraw mapping resolutions valid",
  selected: resolutions.selections.length,
  composedAssemblies: resolutions.assemblies.length,
  intentionallyBlocked: resolutions.blocked.length,
  sourcePolicy: resolutions.sourcePolicy,
}));
