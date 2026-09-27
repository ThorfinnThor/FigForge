import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { anchorRegistrySchema } from "../src/contracts/anchor-registry.js";
import { sourceLockSchema } from "../src/contracts/source-lock.js";
import { testAssortmentSchema } from "../src/contracts/test-assortment.js";
import { buildFixtureModelPackage, MODEL_PACKAGE_URL } from "./assets/fixture-model-package.js";

const sha256 = (content: string): string => createHash("sha256").update(content, "utf8").digest("hex");

const assortmentPath = resolve(process.cwd(), "data/curated/ff03-test-assortment.json");
const sourceLockPath = resolve(process.cwd(), "data/sources.lock.json");
const anchorPath = resolve(process.cwd(), "data/curated/ff05-anchor-registry.json");
const assortmentContent = await readFile(assortmentPath, "utf8");
const sourceLockContent = await readFile(sourceLockPath, "utf8");
const anchorContent = await readFile(anchorPath, "utf8");
const assortment = testAssortmentSchema.parse(JSON.parse(assortmentContent) as unknown);
sourceLockSchema.parse(JSON.parse(sourceLockContent) as unknown);
const anchorRegistry = anchorRegistrySchema.parse(JSON.parse(anchorContent) as unknown);
const build = buildFixtureModelPackage({
  assortment,
  anchorRegistry,
  assortmentSha256: sha256(assortmentContent),
  sourceLockSha256: sha256(sourceLockContent),
  anchorRegistrySha256: sha256(anchorContent),
});

const writePublicAsset = async (url: string, content: string): Promise<void> => {
  const target = resolve(process.cwd(), `public${url}`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
};

await writePublicAsset(MODEL_PACKAGE_URL, build.packageContent);
for (const [url, content] of build.thumbnailContents) {
  await writePublicAsset(url, content);
}
await writeFile(
  resolve(process.cwd(), "data/generated/model-packages.json"),
  `${JSON.stringify(build.index, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({ message: "FF-10 synthetic model package generated", ...build.index.summary }));
