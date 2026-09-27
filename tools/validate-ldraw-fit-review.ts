import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compatibilityMatrixSchema } from "../src/contracts/compatibility.js";
import { ldrawFitReviewSchema } from "../src/contracts/ldraw-fit-review.js";

const paths = {
  mapping: resolve("data/curated/ldraw-catalog-mappings.json"),
  thumbnailIndex: resolve("data/generated/ldraw-catalog-thumbnails.json"),
  prototypeModel: resolve("public/assets/ldraw/prototype/models/figforge-minifigure.ldr"),
  materials: resolve("public/assets/ldraw/catalog/LDConfig.ldr"),
  fitReview: resolve("data/generated/ldraw-fit-review.json"),
  compatibility: resolve("data/curated/ff16-compatibility-matrix.json"),
};

const [mappingRaw, thumbnailIndexRaw, prototypeRaw, materialsRaw, fitReviewRaw, compatibilityRaw] =
  await Promise.all([
    readFile(paths.mapping),
    readFile(paths.thumbnailIndex),
    readFile(paths.prototypeModel),
    readFile(paths.materials),
    readFile(paths.fitReview, "utf8"),
    readFile(paths.compatibility, "utf8"),
  ]);

const sha256 = (content: string | Buffer): string => createHash("sha256").update(content).digest("hex");
const fitReview = ldrawFitReviewSchema.parse(JSON.parse(fitReviewRaw) as unknown);
const compatibility = compatibilityMatrixSchema.parse(JSON.parse(compatibilityRaw) as unknown);
const mapping = JSON.parse(mappingRaw.toString("utf8")) as {
  entries: Array<{
    componentId: string;
    status: "verified" | "blocked";
    ldrawFile?: string;
    fileSha256?: string;
  }>;
};

const expectedSourceHashes = {
  mappingSha256: sha256(mappingRaw),
  thumbnailIndexSha256: sha256(thumbnailIndexRaw),
  prototypeModelSha256: sha256(prototypeRaw),
  materialsSha256: sha256(materialsRaw),
};
if (JSON.stringify(fitReview.sourceHashes) !== JSON.stringify(expectedSourceHashes)) {
  throw new Error("LDraw fit-review preflight is stale against its source files");
}

const verifiedMappings = new Map(
  mapping.entries.filter(({ status }) => status === "verified").map((entry) => [entry.componentId, entry]),
);
if (verifiedMappings.size !== fitReview.entries.length) {
  throw new Error("Fit-review entry count differs from verified LDraw mappings");
}

const compatibilityByComponent = new Map(
  compatibility.componentRules.map((rule) => [rule.componentId, rule]),
);
for (const entry of fitReview.entries) {
  const mappingEntry = verifiedMappings.get(entry.componentId);
  if (!mappingEntry?.ldrawFile || !mappingEntry.fileSha256) {
    throw new Error(`Fit-review entry has no verified mapping: ${entry.componentId}`);
  }
  const [sourceFile, packedModel] = await Promise.all([
    readFile(resolve(`public/assets/ldraw/catalog/${entry.ldrawFile}`)),
    readFile(resolve(`public${entry.packedModelUrl}`)),
  ]);
  if (sha256(sourceFile) !== entry.sourceFileSha256 || entry.sourceFileSha256 !== mappingEntry.fileSha256) {
    throw new Error(`Official LDraw source hash mismatch for ${entry.componentId}`);
  }
  if (sha256(packedModel) !== entry.packedModelSha256) {
    throw new Error(`Packed LDraw source hash mismatch for ${entry.componentId}`);
  }
  const rule = compatibilityByComponent.get(entry.componentId);
  if (!rule || rule.decision !== "blocked" || entry.compatibilityDecision !== "blocked") {
    throw new Error(`Fit preflight must not approve compatibility for ${entry.componentId}`);
  }
  if (entry.role === "handAccessory") {
    if (entry.placement.mode !== "separate-unattached-inspection" || entry.placement.transformLdu !== null) {
      throw new Error(`Accessory placement must remain unattached for ${entry.componentId}`);
    }
  } else if (entry.placement.mode !== "prototype-family-origin" || !entry.placement.transformLdu) {
    throw new Error(`Candidate prototype transform is missing for ${entry.componentId}`);
  }
}

const knownComponentIds = new Set(fitReview.entries.map(({ componentId }) => componentId));
for (const reviewCase of fitReview.reviewCases) {
  if (!reviewCase.componentIds.every((componentId) => knownComponentIds.has(componentId))) {
    throw new Error(`Fit-review case references an unknown component: ${reviewCase.id}`);
  }
  if (reviewCase.referenceFiles.some((path) => /(?:moc|api)/iu.test(path))) {
    throw new Error(`Fit-review case has a forbidden reference: ${reviewCase.id}`);
  }
}

console.log(JSON.stringify({
  message: "LDraw fit-review preflight valid",
  ...fitReview.summary,
  publishable: fitReview.publishable,
  sourcePolicy: fitReview.sourcePolicy,
}));
