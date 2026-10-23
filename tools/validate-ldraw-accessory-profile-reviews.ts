import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readAccessoryPlacementReviews } from "./lib/ldraw-accessory-placement-reviews.js";
import { readAccessoryProfileReviews } from "./lib/ldraw-accessory-profile-reviews.js";

const root = process.cwd();
const profiles = await readAccessoryProfileReviews(root);
const placementReviews = await readAccessoryPlacementReviews(root);
const placementKeys = new Set(placementReviews.reviews.map(({ rebrickablePartNum }) =>
  rebrickablePartNum.trim().toLowerCase()));
const catalog = JSON.parse(await readFile(
  resolve(root, "data/generated/ldraw-expanded-catalog.json"),
  "utf8",
)) as {
  entries: Array<{
    rebrickablePartNum: string;
    ldrawFile: string;
    placementMode: string;
    digitalValidation?: {
      gripLengthLdu: number;
      gripCandidatesTested: number;
      orientationCandidatesTested: number;
      selectedGripCandidateIndex: number;
      selectedOrientationIndex: number;
      gripPrimitive: string;
      collisionSampleCount: number;
    };
  }>;
};
const entryByPartNum = new Map(catalog.entries.map((entry) => [entry.rebrickablePartNum.trim().toLowerCase(), entry]));

let memberCount = 0;
for (const family of profiles.families) {
  for (const member of family.members) {
    const key = member.rebrickablePartNum.trim().toLowerCase();
    if (placementKeys.has(key)) {
      throw new Error(`Accessory profile member also has a placement review: ${member.rebrickablePartNum}`);
    }
    const generated = entryByPartNum.get(key);
    const validation = generated?.digitalValidation;
    if (
      generated?.ldrawFile !== member.ldrawFile
      || generated.placementMode !== "snap-connector"
      || validation?.gripPrimitive !== family.detectedGripPrimitive
      || validation.gripLengthLdu !== family.detectedGripLengthLdu
      || validation.gripCandidatesTested !== family.gripCandidatesTested
      || validation.orientationCandidatesTested !== family.orientationCandidatesTested
      || validation.selectedGripCandidateIndex !== family.selectedGripCandidateIndex
      || validation.selectedOrientationIndex !== family.selectedOrientationIndex
      || validation.collisionSampleCount !== 0
    ) {
      throw new Error(`Generated catalog does not implement accessory profile: ${member.rebrickablePartNum}`);
    }
    memberCount += 1;
  }
}

console.log(`Validated ${profiles.families.length} accessory profile famil${profiles.families.length === 1 ? "y" : "ies"} with ${memberCount} member part(s).`);
