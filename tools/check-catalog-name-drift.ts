import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { catalogPackageSchema } from "../src/contracts/catalog-package.js";
import { normalizeCatalogEvidenceName } from "./lib/ldraw-review.js";

/**
 * Read-only report of every audited catalog name that no longer matches the current
 * Rebrickable catalog. The individual validators stop at the first mismatch; this
 * script lists all of them at once so one review round can fix them together.
 * Curated files stay human-owned: the report prints old and new name, nothing is rewritten.
 */
const root = process.cwd();

const PACKAGES = [
  ["head", "head.json"],
  ["headwear", "headwear.json"],
  ["torsoAssembly", "torso-assembly.json"],
  ["legsAssembly", "legs-assembly.json"],
  ["handAccessory", "hand-accessory.json"],
] as const;

/** Curated files holding audited evidence, and the arrays inside them that pin a catalog name. */
const CURATED_FILES = [
  ["data/curated/ldraw-ambiguous-mapping-resolutions.json", ["selections", "assemblies", "blocked"]],
  ["data/curated/ldraw-accessory-grip-intent-reviews.json", ["reviews"]],
  ["data/curated/ldraw-accessory-placement-reviews.json", ["reviews"]],
  ["data/curated/ldraw-multiple-grip-clearance-reviews.json", ["reviews"]],
  ["data/curated/ldraw-no-radius-grip-clearance-reviews.json", ["reviews"]],
  ["data/curated/ldraw-unique-grip-clearance-reviews.json", ["reviews"]],
] as const;

type PinnedEntry = { role?: string; rebrickablePartNum?: string; catalogName?: string };

const namesByRoleAndPart = new Map<string, string>();
for (const [role, file] of PACKAGES) {
  const source: unknown = JSON.parse(await readFile(resolve(root, "data/generated/catalog-packages", file), "utf8"));
  for (const part of catalogPackageSchema.parse(source).parts) {
    namesByRoleAndPart.set(`${role}:${part.rebrickablePartNum}`, part.name);
  }
}

type Drift = { file: string; key: string; pinned: string; current: string | null };
const drifts: Drift[] = [];
let checked = 0;

for (const [file, arrays] of CURATED_FILES) {
  const document = JSON.parse(await readFile(resolve(root, file), "utf8")) as Record<string, unknown>;
  for (const arrayName of arrays) {
    const entries = document[arrayName];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries as PinnedEntry[]) {
      if (!entry.rebrickablePartNum || !entry.catalogName) continue;
      // Hand-accessory reviews do not repeat the role; every other file names it.
      const key = `${entry.role ?? "handAccessory"}:${entry.rebrickablePartNum}`;
      const current = namesByRoleAndPart.get(key) ?? null;
      checked += 1;
      if (current === null || normalizeCatalogEvidenceName(current) !== normalizeCatalogEvidenceName(entry.catalogName)) {
        drifts.push({ file, key, pinned: entry.catalogName, current });
      }
    }
  }
}

if (drifts.length === 0) {
  console.log(JSON.stringify({ message: "audited catalog names match the current catalog", checked }));
} else {
  console.error(`${drifts.length} of ${checked} audited catalog names no longer match the catalog:\n`);
  for (const { file, key, pinned, current } of drifts) {
    console.error(`- ${key}  (${file})\n    pinned:  ${pinned}\n    current: ${current ?? "<part no longer in the catalog>"}`);
  }
  console.error("\nUpdate the pinned names in the curated files after checking each change is only a rename, not a different part.");
  process.exitCode = 1;
}
