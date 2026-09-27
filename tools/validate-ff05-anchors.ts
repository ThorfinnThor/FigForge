import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { anchorRegistrySchema } from "../src/contracts/anchor-registry.js";

const raw = await readFile(resolve(process.cwd(), "data/curated/ff05-anchor-registry.json"), "utf8");
const registry = anchorRegistrySchema.parse(JSON.parse(raw) as unknown);

if (registry.anchors.some(({ reviewStatus }) => reviewStatus !== "fixture-only")) {
  throw new Error("FF-05 synthetic anchors must not be marked as verified");
}

console.log(
  JSON.stringify({
    message: "FF-05 anchor registry valid",
    profileId: registry.profileId,
    anchorCount: registry.anchors.length,
    publishable: registry.publishable,
    reviewStatuses: [...new Set(registry.anchors.map(({ reviewStatus }) => reviewStatus))],
  }),
);
