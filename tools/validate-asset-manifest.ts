import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assetManifestSchema, publicNoticesSchema } from "../src/contracts/asset-manifest.js";
import { mappingReviewSchema } from "../src/contracts/mapping-review.js";
import { modelPackageIndexSchema } from "../src/contracts/model-package.js";
import { sourceLockSchema } from "../src/contracts/source-lock.js";
import { buildAssetManifest, PUBLIC_NOTICES_PATH } from "./licenses/asset-manifest.js";

const sha256 = (content: string): string => createHash("sha256").update(content, "utf8").digest("hex");
const bytes = (content: string): number => Buffer.byteLength(content, "utf8");

const sourceLockContent = await readFile(resolve(process.cwd(), "data/sources.lock.json"), "utf8");
const modelPackageIndexContent = await readFile(resolve(process.cwd(), "data/generated/model-packages.json"), "utf8");
const mappingReviewContent = await readFile(resolve(process.cwd(), "data/generated/mapping-review.json"), "utf8");
const threeLicenseContent = await readFile(resolve(process.cwd(), "public/licenses/three-MIT.txt"), "utf8");
const ldcadShadowNoticeContent = await readFile(resolve(process.cwd(), "public/licenses/LDCadShadowLibrary-NOTICE.txt"), "utf8");
const ldrawNoticeContent = await readFile(resolve(process.cwd(), "public/licenses/LDraw-CAreadme.txt"), "utf8");
const sourceLock = sourceLockSchema.parse(JSON.parse(sourceLockContent) as unknown);
const modelPackageIndex = modelPackageIndexSchema.parse(JSON.parse(modelPackageIndexContent) as unknown);
const mappingReview = mappingReviewSchema.parse(JSON.parse(mappingReviewContent) as unknown);
const manifestContent = await readFile(resolve(process.cwd(), "data/generated/asset-manifest.json"), "utf8");
const publicManifestContent = await readFile(resolve(process.cwd(), "public/assets/asset-manifest.json"), "utf8");
const noticesContent = await readFile(resolve(process.cwd(), `public${PUBLIC_NOTICES_PATH}`), "utf8");
const manifest = assetManifestSchema.parse(JSON.parse(manifestContent) as unknown);
const publicManifest = assetManifestSchema.parse(JSON.parse(publicManifestContent) as unknown);
const notices = publicNoticesSchema.parse(JSON.parse(noticesContent) as unknown);
const expected = buildAssetManifest({
  sourceLockSha256: sha256(sourceLockContent),
  modelPackageIndexSha256: sha256(modelPackageIndexContent),
  mappingReviewSha256: sha256(mappingReviewContent),
  modelPackageIndex,
  mappingReview,
  threeLicenseSha256: sha256(threeLicenseContent),
  ldcadShadowNoticeSha256: sha256(ldcadShadowNoticeContent),
  ldrawNoticeSha256: sha256(ldrawNoticeContent),
});

assert.equal(sourceLock.sources[0].apiUsed, false, "Asset manifest cannot be based on the Rebrickable API");
assert.equal(manifestContent, expected.manifestContent, "Asset manifest is not deterministic");
assert.equal(publicManifestContent, manifestContent, "Public and generated manifests differ");
assert.deepEqual(publicManifest, manifest, "Public manifest schema differs from generated manifest");
assert.deepEqual(manifest, expected.manifest, "Asset manifest schema is stale");
assert.deepEqual(notices, expected.notices, "Public source notices are stale");
assert.equal(noticesContent, expected.noticesContent, "Public source notices are not deterministic");
assert.equal(manifest.noticesFile.path, PUBLIC_NOTICES_PATH);
assert.equal(manifest.noticesFile.sha256, sha256(noticesContent));
assert.equal(manifest.noticesFile.bytes, bytes(noticesContent));
assert.equal(manifest.release.status, "blocked");
assert.equal(manifest.release.publishable, false);
assert(manifest.assets.every(({ publishable, status }) => publishable === false && status === "blocked"));
assert(manifest.assets.every(({ path }) => path.startsWith("/assets/")));
assert(!manifestContent.toLowerCase().includes("/api/"), "API URL found in asset manifest");
assert(!manifestContent.toLowerCase().includes(".moc"), "MOC file reference found in asset manifest");

const threeEvidence = manifest.licenseEvidence.find(({ id }) => id === "license:three:mit");
assert(threeEvidence, "Three.js license evidence is missing");
assert.equal(threeEvidence.sha256, sha256(threeLicenseContent));
assert.equal(threeEvidence.status, "confirmed");
const snapEvidence = manifest.licenseEvidence.find(({ id }) => id === "license:ldcad-shadow:cc-by-sa-4.0");
assert(snapEvidence, "LDCad Shadow Library license evidence is missing");
assert.equal(snapEvidence.sha256, sha256(ldcadShadowNoticeContent));
assert.equal(snapEvidence.status, "confirmed");
const ldrawEvidence = manifest.licenseEvidence.find(({ id }) => id === "license:ldraw:official-parts");
assert(ldrawEvidence, "LDraw Parts Library license evidence is missing");
assert.equal(ldrawEvidence.sha256, sha256(ldrawNoticeContent));
assert.equal(ldrawEvidence.status, "confirmed");
for (const evidence of manifest.licenseEvidence) {
  assert(manifest.sourceNotices.some(({ id }) => id === evidence.sourceId), `Unknown source for ${evidence.id}`);
}
for (const asset of manifest.assets) {
  for (const evidenceId of asset.licenseEvidenceIds) {
    assert(manifest.licenseEvidence.some(({ id }) => id === evidenceId), `Unknown license evidence for ${asset.id}`);
  }
}

console.log(JSON.stringify({
  message: "FF-11 asset manifest valid",
  assetCount: manifest.assets.length,
  sourceNoticeCount: manifest.sourceNotices.length,
  licenseEvidenceCount: manifest.licenseEvidence.length,
  releaseStatus: manifest.release.status,
  publishable: manifest.release.publishable,
}));
