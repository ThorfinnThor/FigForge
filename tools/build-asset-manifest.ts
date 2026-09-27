import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assetManifestSchema } from "../src/contracts/asset-manifest.js";
import { mappingReviewSchema } from "../src/contracts/mapping-review.js";
import { modelPackageIndexSchema } from "../src/contracts/model-package.js";
import { sourceLockSchema } from "../src/contracts/source-lock.js";
import { buildAssetManifest, PUBLIC_NOTICES_PATH } from "./licenses/asset-manifest.js";

const sha256 = (content: string): string => createHash("sha256").update(content, "utf8").digest("hex");

const sourceLockContent = await readFile(resolve(process.cwd(), "data/sources.lock.json"), "utf8");
const modelPackageIndexContent = await readFile(resolve(process.cwd(), "data/generated/model-packages.json"), "utf8");
const mappingReviewContent = await readFile(resolve(process.cwd(), "data/generated/mapping-review.json"), "utf8");
const threeLicenseContent = await readFile(resolve(process.cwd(), "public/licenses/three-MIT.txt"), "utf8");
const ldcadShadowNoticeContent = await readFile(resolve(process.cwd(), "public/licenses/LDCadShadowLibrary-NOTICE.txt"), "utf8");
const sourceLock = sourceLockSchema.parse(JSON.parse(sourceLockContent) as unknown);
const modelPackageIndex = modelPackageIndexSchema.parse(JSON.parse(modelPackageIndexContent) as unknown);
const mappingReview = mappingReviewSchema.parse(JSON.parse(mappingReviewContent) as unknown);
const build = buildAssetManifest({
  sourceLockSha256: sha256(sourceLockContent),
  modelPackageIndexSha256: sha256(modelPackageIndexContent),
  mappingReviewSha256: sha256(mappingReviewContent),
  modelPackageIndex,
  mappingReview,
  threeLicenseSha256: sha256(threeLicenseContent),
  ldcadShadowNoticeSha256: sha256(ldcadShadowNoticeContent),
});
assetManifestSchema.parse(build.manifest);

await writeFile(resolve(process.cwd(), "data/generated/asset-manifest.json"), build.manifestContent, "utf8");
await writeFile(resolve(process.cwd(), "public/assets/asset-manifest.json"), build.manifestContent, "utf8");
await writeFile(resolve(process.cwd(), `public${PUBLIC_NOTICES_PATH}`), build.noticesContent, "utf8");

console.log(JSON.stringify({
  message: "FF-11 asset manifest and source notices generated",
  assetCount: build.manifest.assets.length,
  sourceNoticeCount: build.manifest.sourceNotices.length,
  licenseEvidenceCount: build.manifest.licenseEvidence.length,
  releaseStatus: build.manifest.release.status,
  sourcePolicy: sourceLock.sources[0].kind,
}));
