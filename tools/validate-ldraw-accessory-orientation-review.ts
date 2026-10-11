import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ldrawAccessoryOrientationReviewSchema } from "../src/contracts/ldraw-accessory-orientation-review.js";
import { ldrawRuntimePackageSchema } from "../src/contracts/ldraw-runtime-package.js";

const root = process.cwd();
const runtimePath = resolve(root, "data/generated/ldraw-runtime/hand-accessory.json");
const expandedPath = resolve(root, "data/generated/ldraw-expanded-catalog.json");
const reviewPath = resolve(root, "data/generated/ldraw-accessory-orientation-review.json");
const sha256 = (content: Buffer): string => createHash("sha256").update(content).digest("hex");

const [runtimeRaw, expandedRaw, reviewRaw] = await Promise.all([
  readFile(runtimePath),
  readFile(expandedPath),
  readFile(reviewPath),
]);
const runtime = ldrawRuntimePackageSchema.parse(JSON.parse(runtimeRaw.toString("utf8")) as unknown);
const review = ldrawAccessoryOrientationReviewSchema.parse(JSON.parse(reviewRaw.toString("utf8")) as unknown);
const expanded = JSON.parse(expandedRaw.toString("utf8")) as {
  entries: Array<{ componentId: string; role: string; digitalValidation?: { status: string } }>;
};
const expandedByComponent = new Map(expanded.entries.map((entry) => [entry.componentId, entry]));
if (review.sourceHashes.runtimePackageSha256 !== sha256(runtimeRaw)) throw new Error("Accessory review queue is stale against runtime package");
if (review.sourceHashes.expandedCatalogSha256 !== sha256(expandedRaw)) throw new Error("Accessory review queue is stale against expanded catalog");
if (review.entries.length !== runtime.entries.length) throw new Error("Accessory review queue differs from runtime package");

const runtimeIds = new Set(runtime.entries.map(({ componentId }) => componentId));
for (const entry of review.entries) {
  if (!runtimeIds.has(entry.componentId)) throw new Error(`Unknown runtime component in review queue: ${entry.componentId}`);
  const expandedEntry = expandedByComponent.get(entry.componentId);
  if (!expandedEntry || expandedEntry.role !== "handAccessory" || expandedEntry.digitalValidation?.status !== "passed") {
    throw new Error(`Review queue entry has no passed expanded evidence: ${entry.componentId}`);
  }
  if (entry.reviewStatus !== "pending-human-visual-review" || entry.reviewer !== null || entry.reviewedAt !== null) {
    throw new Error(`Review queue contains an unreviewed entry with a result: ${entry.componentId}`);
  }
  const expectedScore = 1
    + (entry.riskFlags.includes("non-default-orientation") ? 1 : 0)
    + (entry.riskFlags.includes("long-accessory-extent") ? 1 : 0)
    + (entry.riskFlags.includes("multiple-grip-candidates") ? 2 : 0);
  if (entry.priorityScore !== expectedScore) throw new Error(`Priority score is stale: ${entry.componentId}`);
  if (entry.reviewViews.join(",") !== "three-quarter,front,back") throw new Error(`Review views are incomplete: ${entry.componentId}`);
}

console.log(JSON.stringify({ message: "accessory orientation review queue valid", ...review.summary }));
