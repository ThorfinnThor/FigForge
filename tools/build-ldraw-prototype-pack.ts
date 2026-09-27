import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";

const ROOT = "public/assets/ldraw/prototype";
const SOURCE_MODEL = join(ROOT, "models/figforge-minifigure.ldr");
const OUTPUT_MODEL = join(ROOT, "models/figforge-minifigure-packed.mpd");

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  }));
  return files.flat();
}

function embeddedName(path: string): string {
  if (path.startsWith("parts/s/")) {
    return path;
  }
  return basename(path);
}

const dependencyPaths = (await collectFiles(ROOT))
  .map((path) => relative(ROOT, path).split(sep).join("/"))
  .filter((path) => path.endsWith(".dat"))
  .sort();

const names = new Map<string, string>();
for (const path of dependencyPaths) {
  const name = embeddedName(path);
  const existing = names.get(name);
  if (existing && existing !== path) {
    throw new Error(`Ambiguous packed LDraw name ${name}: ${existing} vs ${path}`);
  }
  names.set(name, path);
}

const sourceModel = (await readFile(SOURCE_MODEL, "utf8")).trimEnd();
const sections = [
  "0 FILE figforge-minifigure-packed.mpd",
  sourceModel,
];

for (const path of dependencyPaths) {
  const content = (await readFile(join(ROOT, path), "utf8")).trimEnd();
  sections.push(`0 FILE ${embeddedName(path)}`, content);
}

await writeFile(OUTPUT_MODEL, `${sections.join("\n")}\n`, "utf8");
console.log(`Packed ${dependencyPaths.length} official LDraw dependencies into ${OUTPUT_MODEL}`);
