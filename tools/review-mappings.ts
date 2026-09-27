import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ff06ProcurementDatasetSchema } from "../src/contracts/procurement.js";
import { sourceLockSchema } from "../src/contracts/source-lock.js";
import { testAssortmentSchema } from "../src/contracts/test-assortment.js";
import { buildMappingReview } from "./mapping-review.js";

const readJson = async (relativePath: string): Promise<unknown> =>
  JSON.parse(await readFile(resolve(process.cwd(), relativePath), "utf8")) as unknown;

const assortmentPath = resolve(process.cwd(), "data/curated/ff03-test-assortment.json");
const sourceLockPath = resolve(process.cwd(), "data/sources.lock.json");
const assortmentContent = await readFile(assortmentPath, "utf8");
const sourceLockContent = await readFile(sourceLockPath, "utf8");
const assortment = testAssortmentSchema.parse(JSON.parse(assortmentContent) as unknown);
const procurement = ff06ProcurementDatasetSchema.parse(
  await readJson("data/curated/ff06-procurement-recipes.json"),
);
sourceLockSchema.parse(JSON.parse(sourceLockContent) as unknown);

const report = buildMappingReview({
  assortment,
  procurement,
  sourceAssortmentSha256: createHash("sha256").update(assortmentContent).digest("hex"),
  sourceLockSha256: createHash("sha256").update(sourceLockContent).digest("hex"),
});

await writeFile(
  resolve(process.cwd(), "data/generated/mapping-review.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({ message: "FF-09 mapping review generated", ...report.summary }));
