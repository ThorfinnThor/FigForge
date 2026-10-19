import { appendFileSync } from "node:fs";
import {
  BRICKLINK_SNAPSHOT_MAX_AGE_DAYS,
  bricklinkSnapshotAgeDays,
  readBrickLinkItemCrosswalk,
} from "./lib/bricklink-item-crosswalk.js";

const crosswalk = await readBrickLinkItemCrosswalk(process.cwd());
const ageDays = bricklinkSnapshotAgeDays(crosswalk.snapshotDate, new Date());
const stale = ageDays > BRICKLINK_SNAPSHOT_MAX_AGE_DAYS;
const result = {
  snapshotDate: crosswalk.snapshotDate,
  ageDays,
  maxAgeDays: BRICKLINK_SNAPSHOT_MAX_AGE_DAYS,
  stale,
  notInSnapshotPartCount: crosswalk.summary.notInSnapshotPartCount,
};
console.log(JSON.stringify(result));
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `stale=${stale}\nage_days=${ageDays}\nsnapshot_date=${crosswalk.snapshotDate}\nnot_in_snapshot=${result.notInSnapshotPartCount}\n`,
  );
}
