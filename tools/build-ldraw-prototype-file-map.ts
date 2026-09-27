import { readdir, writeFile } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";

const ROOT = "public/assets/ldraw/prototype";
const OUTPUT = join(ROOT, "file-map.json");

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  }));
  return files.flat();
}

const files = (await collectFiles(ROOT))
  .map((path) => relative(ROOT, path).split(sep).join("/"))
  .filter((path) => path.endsWith(".dat"))
  .sort();
const fileMap = new Map<string, string>();

function register(reference: string, path: string): void {
  const existing = fileMap.get(reference);
  if (existing && existing !== path) {
    throw new Error(`Ambiguous LDraw reference ${reference}: ${existing} vs ${path}`);
  }
  fileMap.set(reference, path);
}

for (const path of files) {
  if (path.startsWith("parts/s/")) {
    const subpartPath = path.slice("parts/".length);
    register(path, subpartPath);
    register(subpartPath, subpartPath);
  } else if (path.startsWith("parts/")) {
    const fileName = basename(path);
    register(path, fileName);
    register(fileName, fileName);
  } else if (path.startsWith("p/")) {
    const primitivePath = `../${path}`;
    register(path, primitivePath);
    register(basename(path), primitivePath);
  }
}

const document = Object.fromEntries([...fileMap.entries()].sort(([left], [right]) => left.localeCompare(right)));
await writeFile(OUTPUT, `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.log(`Wrote ${fileMap.size} deterministic LDraw path mappings to ${OUTPUT}`);
