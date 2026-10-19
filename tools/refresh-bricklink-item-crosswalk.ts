import { refreshBrickLinkItemCrosswalkFile } from "./lib/bricklink-item-crosswalk.js";

const { changed, crosswalk } = await refreshBrickLinkItemCrosswalkFile(process.cwd());
console.log(JSON.stringify({
  message: changed ? "BrickLink item crosswalk refreshed" : "BrickLink item crosswalk already up to date",
  snapshotDate: crosswalk.snapshotDate,
  ...crosswalk.summary,
}));
