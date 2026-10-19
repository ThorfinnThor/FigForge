import { resolve } from "node:path";
import { importBrickLinkItemCrosswalk } from "./lib/bricklink-item-crosswalk.js";

const [partsArgument, partColorCodesArgument] = process.argv.slice(2);
if (!partsArgument || !partColorCodesArgument) {
  throw new Error("Usage: npm run data:import:bricklink -- <Parts.txt> <Part-and-Color-Codes.txt>");
}

const root = process.cwd();
const result = await importBrickLinkItemCrosswalk(root, resolve(partsArgument), resolve(partColorCodesArgument));
console.log(JSON.stringify({
  message: "BrickLink item crosswalk imported",
  sourcePolicy: result.sourcePolicy,
  ...result.summary,
  sources: result.sources,
}));
