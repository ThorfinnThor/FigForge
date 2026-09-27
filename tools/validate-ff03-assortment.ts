import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { sourceLockSchema } from "../src/contracts/source-lock.js";
import { testAssortmentSchema } from "../src/contracts/test-assortment.js";

const readJson = async (relativePath: string): Promise<unknown> =>
  JSON.parse(await readFile(resolve(process.cwd(), relativePath), "utf8")) as unknown;

const sourceLockPath = resolve(process.cwd(), "data/sources.lock.json");
const sourceLockContent = await readFile(sourceLockPath, "utf8");
const sourceLock = sourceLockSchema.parse(JSON.parse(sourceLockContent) as unknown);
const assortment = testAssortmentSchema.parse(
  await readJson("data/curated/ff03-test-assortment.json"),
);
const sourceLockSha256 = createHash("sha256").update(sourceLockContent).digest("hex");

if (sourceLockSha256 !== assortment.sourceLockSha256) {
  throw new Error("FF-03 assortment is not locked to the checked-in source lock hash");
}

const artifactHashes = new Map(
  sourceLock.sources[0].artifacts.map((artifact) => [artifact.fileName, artifact.sha256]),
);
for (const component of assortment.components) {
  for (const row of component.catalogRows) {
    if (row.sha256 !== artifactHashes.get(row.fileName)) {
      throw new Error(`FF-03 evidence hash mismatch for ${row.id}`);
    }
    if (row.value.toLowerCase().includes("moc") || row.fileName.toLowerCase().includes("moc")) {
      throw new Error(`MOC evidence is forbidden: ${row.id}`);
    }
  }
}

console.log(
  JSON.stringify({
    message: "FF-03 test assortment valid",
    componentCount: assortment.components.length,
    variantCount: assortment.variants.length,
    blockedComponentCount: assortment.components.filter((component) => component.releaseStatus === "blocked").length,
    blockedVariantCount: assortment.variants.filter((variant) => variant.releaseStatus === "blocked").length,
    sourcePolicy: assortment.sourcePolicy,
    apiUsed: sourceLock.sources[0].apiUsed,
    mocFilesAllowed: false,
  }),
);
