import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  BRICKLINK_SNAPSHOT_MAX_AGE_DAYS,
  bricklinkSnapshotAgeDays,
  readBrickLinkItemCrosswalk,
} from "./lib/bricklink-item-crosswalk.js";

const root = process.cwd();
const [crosswalk, normalizedText, builderText, curatedText] = await Promise.all([
  readBrickLinkItemCrosswalk(root),
  readFile(resolve(root, "data/generated/catalog-normalized.json"), "utf8"),
  readFile(resolve(root, "data/generated/ldraw-expanded-catalog.json"), "utf8"),
  readFile(resolve(root, "data/curated/ff03-test-assortment.json"), "utf8"),
]);
const normalized = JSON.parse(normalizedText) as { sourceLockSha256: string; parts: Array<{ partNum: string }> };
const builder = JSON.parse(builderText) as { entries: Array<{ rebrickablePartNum: string }> };
const curated = JSON.parse(curatedText) as { components: Array<{ rebrickablePartNum: string }> };
assert.equal(crosswalk.catalogSourceLockSha256, normalized.sourceLockSha256, "BrickLink crosswalk uses a stale catalog lock");
const normalizedParts = new Set(normalized.parts.map(({ partNum }) => partNum.toLowerCase()));
const expectedBuilderParts = new Set([...builder.entries, ...curated.components]
  .map(({ rebrickablePartNum }) => rebrickablePartNum.toLowerCase()));
const actualParts = new Set([...crosswalk.entries, ...crosswalk.unresolved]
  .map(({ rebrickablePartNum }) => rebrickablePartNum.toLowerCase()));
assert.deepEqual(actualParts, expectedBuilderParts, "BrickLink crosswalk does not cover the complete builder catalog");
for (const partNum of actualParts) assert.ok(normalizedParts.has(partNum), `Unknown crosswalk part: ${partNum}`);
const ageDays = bricklinkSnapshotAgeDays(crosswalk.snapshotDate, new Date());
// Age is reported, never a failure: the weekly refresh opens an issue once the snapshot is too old.
console.log(JSON.stringify({
  message: "BrickLink item crosswalk is valid",
  snapshotDate: crosswalk.snapshotDate,
  snapshotAgeDays: ageDays,
  snapshotStale: ageDays > BRICKLINK_SNAPSHOT_MAX_AGE_DAYS,
  ...crosswalk.summary,
}));
