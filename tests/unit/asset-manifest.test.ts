import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import mappingReviewFixture from "../../data/generated/mapping-review.json" with { type: "json" };
import modelPackageIndexFixture from "../../data/generated/model-packages.json" with { type: "json" };
import { assetManifestSchema } from "../../src/contracts/asset-manifest.js";
import { mappingReviewSchema } from "../../src/contracts/mapping-review.js";
import { modelPackageIndexSchema } from "../../src/contracts/model-package.js";
import { buildAssetManifest } from "../../tools/licenses/asset-manifest.js";

const sha256 = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");
const modelPackageIndex = modelPackageIndexSchema.parse(modelPackageIndexFixture);
const mappingReview = mappingReviewSchema.parse(mappingReviewFixture);

describe("FF-11 asset manifest", () => {
  it("records provenance and keeps every current asset blocked", async () => {
    const sourceLockContent = await readFile("data/sources.lock.json", "utf8");
    const modelPackageIndexContent = await readFile("data/generated/model-packages.json", "utf8");
    const mappingReviewContent = await readFile("data/generated/mapping-review.json", "utf8");
    const threeLicenseContent = await readFile("public/licenses/three-MIT.txt", "utf8");
    const ldcadShadowNoticeContent = await readFile("public/licenses/LDCadShadowLibrary-NOTICE.txt", "utf8");
    const ldrawNoticeContent = await readFile("public/licenses/LDraw-CAreadme.txt", "utf8");
    const build = buildAssetManifest({
      sourceLockSha256: sha256(sourceLockContent),
      modelPackageIndexSha256: sha256(modelPackageIndexContent),
      mappingReviewSha256: sha256(mappingReviewContent),
      modelPackageIndex,
      mappingReview,
      threeLicenseSha256: sha256(threeLicenseContent),
      ldcadShadowNoticeSha256: sha256(ldcadShadowNoticeContent),
      ldrawNoticeSha256: sha256(ldrawNoticeContent),
    });

    expect(assetManifestSchema.parse(build.manifest)).toEqual(build.manifest);
    expect(build.manifest.assets).toHaveLength(19);
    expect(build.manifest.assets.every(({ status, publishable }) => status === "blocked" && !publishable)).toBe(true);
    expect(build.manifest.release).toMatchObject({ status: "blocked", publishable: false });
    expect(build.manifest.sourceNotices.find(({ id }) => id === "src:rebrickable-catalog")?.status).toBe("pending");
    expect(build.manifest.sourceNotices.find(({ id }) => id === "src:ldraw-assets")?.status).toBe("confirmed");
    expect(build.manifest.sourceNotices.find(({ id }) => id === "src:ldcad-shadow")?.status).toBe("confirmed");
    expect(build.manifest.licenseEvidence.find(({ id }) => id === "license:three:mit")?.status).toBe("confirmed");
    expect(build.manifest.licenseEvidence.find(({ id }) => id === "license:ldcad-shadow:cc-by-sa-4.0")?.status).toBe("confirmed");
    expect(build.manifest.licenseEvidence.find(({ id }) => id === "license:ldraw:official-parts")?.status).toBe("confirmed");
  });

  it("rejects guessed mapping candidates", () => {
    const invalidReview = structuredClone(mappingReview);
    invalidReview.openMappings[0]!.candidateIds = ["candidate:guessed"];

    expect(() =>
      buildAssetManifest({
        sourceLockSha256: "a".repeat(64),
        modelPackageIndexSha256: "b".repeat(64),
        mappingReviewSha256: "c".repeat(64),
        modelPackageIndex,
        mappingReview: invalidReview,
        threeLicenseSha256: "d".repeat(64),
        ldcadShadowNoticeSha256: "e".repeat(64),
        ldrawNoticeSha256: "f".repeat(64),
      }),
    ).toThrowError(/guessed mapping candidates/u);
  });
});
