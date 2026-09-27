import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { anchorRegistrySchema } from "../src/contracts/anchor-registry.js";
import { compatibilityMatrixSchema } from "../src/contracts/compatibility.js";
import { testAssortmentSchema } from "../src/contracts/test-assortment.js";

const assortmentPath = resolve(process.cwd(), "data/curated/ff03-test-assortment.json");
const anchorsPath = resolve(process.cwd(), "data/curated/ff05-anchor-registry.json");
const matrixPath = resolve(process.cwd(), "data/curated/ff16-compatibility-matrix.json");
const [assortmentRaw, anchorsRaw, matrixRaw] = await Promise.all([
  readFile(assortmentPath),
  readFile(anchorsPath),
  readFile(matrixPath, "utf8"),
]);

const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex");
const assortment = testAssortmentSchema.parse(JSON.parse(assortmentRaw.toString("utf8")) as unknown);
const anchors = anchorRegistrySchema.parse(JSON.parse(anchorsRaw.toString("utf8")) as unknown);
const matrix = compatibilityMatrixSchema.parse(JSON.parse(matrixRaw) as unknown);

if (matrix.sourceAssortmentSha256 !== sha256(assortmentRaw)) {
  throw new Error("FF-16 matrix is stale against the FF-03 assortment");
}
if (matrix.sourceAnchorRegistrySha256 !== sha256(anchorsRaw)) {
  throw new Error("FF-16 matrix is stale against the FF-05 anchor registry");
}
if (matrix.profileId !== anchors.profileId || matrix.publishable || anchors.publishable) {
  throw new Error("FF-16 must remain tied to the non-publishable FF-05 fixture profile");
}

const componentRuleById = new Map(matrix.componentRules.map((rule) => [rule.componentId, rule]));
if (componentRuleById.size !== assortment.components.length) {
  throw new Error("FF-16 needs exactly one compatibility rule for every FF-03 component");
}
for (const component of assortment.components) {
  const rule = componentRuleById.get(component.id);
  if (!rule) {
    throw new Error(`Missing FF-16 rule for ${component.id}`);
  }
  if (component.attachmentProfile.status !== "verified" && rule.decision !== "blocked") {
    throw new Error(`Unverified component ${component.id} must remain blocked`);
  }
  if (rule.allowedSlots.join("|") !== component.attachmentProfile.allowedSlots.join("|")) {
    throw new Error(`FF-16 slot evidence differs from FF-03 for ${component.id}`);
  }
  if (!rule.evidenceIds.every((id) => component.catalogEvidenceIds.includes(id))) {
    throw new Error(`FF-16 component rule has unbound evidence for ${component.id}`);
  }
}

for (const anchor of anchors.anchors) {
  const rule = matrix.fixtureRules.find(
    (candidate) => candidate.slot === anchor.slot && candidate.placementFamily === anchor.placementFamily,
  );
  if (!rule || anchor.reviewStatus !== "fixture-only" || rule.decision !== "warning") {
    throw new Error(`FF-16 fixture warning is missing for ${anchor.slot}`);
  }
}

const excludedPartNumbers = new Set(
  matrix.exclusionRules
    .filter(({ matchType }) => matchType === "rebrickable-part-number")
    .map(({ value }) => value),
);
for (const candidate of assortment.excludedCandidates) {
  if (!excludedPartNumbers.has(candidate.rebrickablePartNum)) {
    throw new Error(`FF-16 exclusion is missing for ${candidate.rebrickablePartNum}`);
  }
}

console.log(JSON.stringify({
  message: "FF-16 compatibility matrix valid",
  componentRuleCount: matrix.componentRules.length,
  fixtureRuleCount: matrix.fixtureRules.length,
  exclusionRuleCount: matrix.exclusionRules.length,
  slotPolicyCount: matrix.slotPolicies.length,
  defaultDecision: matrix.defaultDecision,
  publishable: matrix.publishable,
  sourcePolicy: matrix.sourcePolicy,
}));
