import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ldrawDigitalConnectivitySchema } from "../src/contracts/ldraw-digital-connectivity.js";

const raw = await readFile(resolve(process.cwd(), "data/generated/ldraw-digital-connectivity.json"), "utf8");
const registry = ldrawDigitalConnectivitySchema.parse(JSON.parse(raw) as unknown);
const hash = (value: string): string => createHash("sha256").update(value).digest("hex");

for (const sourceFile of registry.sourceFiles) {
  const content = await readFile(resolve(process.cwd(), sourceFile.path), "utf8");
  if (hash(content) !== sourceFile.sha256) throw new Error(`Stale digital connectivity source: ${sourceFile.path}`);
  if (!content.includes("!LICENSE CC BY-SA 4.0")) throw new Error(`Missing CC BY-SA header: ${sourceFile.path}`);
}
const prototype = await readFile(resolve(process.cwd(), "public/assets/ldraw/prototype/models/figforge-minifigure-packed.mpd"), "utf8");
if (hash(prototype) !== registry.referenceAssemblySha256) throw new Error("Digital connectivity registry is stale against the reference assembly");
if (registry.entries.some((entry) => entry.componentId === "ff03-hand-11439" && entry.status !== "blocked")) {
  throw new Error("11439 must remain blocked without pinned snap metadata");
}
console.log(JSON.stringify({
  message: "LDraw digital connectivity registry valid",
  supported: registry.summary.digitallySupportedCount,
  blocked: registry.summary.blockedCount,
  humanInputRequired: registry.summary.humanInputRequired,
}));
