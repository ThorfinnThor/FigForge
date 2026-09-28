import { readFile, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { catalogPackageSchema, type CatalogRole } from "../src/contracts/catalog-package.js";

const root = process.cwd();
const defaultLibrary = resolve(root, "data/incoming/ldraw-2608/extracted/ldraw");
const libraryArgument = process.argv.find((argument) => argument.startsWith("--library="));
const libraryRoot = libraryArgument ? resolve(libraryArgument.slice("--library=".length)) : defaultLibrary;

const packages = [
  ["head", "head.json"],
  ["headwear", "headwear.json"],
  ["torsoAssembly", "torso-assembly.json"],
  ["legsAssembly", "legs-assembly.json"],
  ["handAccessory", "hand-accessory.json"],
] as const satisfies ReadonlyArray<readonly [CatalogRole, string]>;

type LDrawCandidate = {
  file: string;
  matchType: "exact-filename" | "explicit-keyword";
};

const normalize = (value: string): string => value.trim().toLowerCase();

const addCandidate = (
  index: Map<string, LDrawCandidate[]>,
  rebrickablePartNum: string,
  candidate: LDrawCandidate,
): void => {
  const key = normalize(rebrickablePartNum);
  const existing = index.get(key) ?? [];
  if (!existing.some(({ file, matchType }) => file === candidate.file && matchType === candidate.matchType)) {
    existing.push(candidate);
    index.set(key, existing);
  }
};

const partsDirectory = resolve(libraryRoot, "parts");
const directoryEntries = await readdir(partsDirectory, { withFileTypes: true });
const officialPartFiles = directoryEntries
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".dat"))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right));

const candidateIndex = new Map<string, LDrawCandidate[]>();
for (const fileName of officialPartFiles) {
  const file = `parts/${fileName}`;
  addCandidate(candidateIndex, basename(fileName, ".dat"), { file, matchType: "exact-filename" });

  const source = await readFile(resolve(partsDirectory, fileName), "utf8");
  for (const line of source.split(/\r?\n/u)) {
    if (!/^0\s+!KEYWORDS\b/iu.test(line)) continue;
    const match = /(?:^|,\s*)Rebrickable\s+([^,\s]+)/iu.exec(line);
    if (match?.[1]) {
      addCandidate(candidateIndex, match[1], { file, matchType: "explicit-keyword" });
    }
  }
}

const summary: Record<string, unknown> = {
  libraryRoot,
  officialTopLevelPartFiles: officialPartFiles.length,
  sourcePolicy: "Only official LDraw part files and explicit Rebrickable IDs; no models or MOC files.",
  roles: {},
};

let totalParts = 0;
let totalUnique = 0;
let totalAmbiguous = 0;
const roles = summary.roles as Record<string, unknown>;

for (const [role, fileName] of packages) {
  const packageSource = await readFile(resolve(root, "data/generated/catalog-packages", fileName), "utf8");
  const catalogPackage = catalogPackageSchema.parse(JSON.parse(packageSource));
  const matches = catalogPackage.parts.map((part) => {
    const candidates = candidateIndex.get(normalize(part.rebrickablePartNum)) ?? [];
    const uniqueFiles = [...new Set(candidates.map(({ file }) => file))];
    return { part, candidates, uniqueFiles };
  });
  const unique = matches.filter(({ uniqueFiles }) => uniqueFiles.length === 1);
  const ambiguous = matches.filter(({ uniqueFiles }) => uniqueFiles.length > 1);
  const exact = unique.filter(({ candidates }) => candidates.some(({ matchType }) => matchType === "exact-filename"));
  const keywordOnly = unique.filter(({ candidates }) => candidates.every(({ matchType }) => matchType === "explicit-keyword"));

  roles[role] = {
    catalogParts: catalogPackage.parts.length,
    uniqueMatches: unique.length,
    exactFilenameMatches: exact.length,
    explicitKeywordOnlyMatches: keywordOnly.length,
    ambiguousMatches: ambiguous.length,
    unmatched: catalogPackage.parts.length - unique.length - ambiguous.length,
    examples: unique.slice(0, 8).map(({ part, uniqueFiles, candidates }) => ({
      rebrickablePartNum: part.rebrickablePartNum,
      ldrawFile: uniqueFiles[0],
      evidence: candidates.map(({ matchType }) => matchType),
    })),
    ambiguousExamples: ambiguous.slice(0, 5).map(({ part, uniqueFiles }) => ({
      rebrickablePartNum: part.rebrickablePartNum,
      ldrawFiles: uniqueFiles,
    })),
  };
  totalParts += catalogPackage.parts.length;
  totalUnique += unique.length;
  totalAmbiguous += ambiguous.length;
}

summary.totals = {
  catalogParts: totalParts,
  uniqueMatches: totalUnique,
  ambiguousMatches: totalAmbiguous,
  unmatched: totalParts - totalUnique - totalAmbiguous,
};

console.log(JSON.stringify(summary, null, 2));
