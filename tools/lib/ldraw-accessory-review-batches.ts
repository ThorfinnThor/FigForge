import { ldrawAccessoryOrientationReviewSchema } from "../../src/contracts/ldraw-accessory-orientation-review.js";

export type AccessoryOrientationReviewDocument = ReturnType<typeof ldrawAccessoryOrientationReviewSchema.parse>;
export type AccessoryOrientationReviewEntry = AccessoryOrientationReviewDocument["entries"][number];
export type AccessoryOrientationReviewGroup = {
  representative: AccessoryOrientationReviewEntry;
  members: AccessoryOrientationReviewEntry[];
};

const variantBase = (partNum: string): string => partNum.toLocaleLowerCase("en-US")
  .replace(/(?:pr|pat)\d+$/u, "");

const reviewFingerprint = (entry: AccessoryOrientationReviewEntry): string => JSON.stringify({
  base: variantBase(entry.rebrickablePartNum),
  transform: entry.placementTransformLdu,
  validation: entry.digitalValidation,
});

export const createRiskReviewGroups = (
  entries: readonly AccessoryOrientationReviewEntry[],
): AccessoryOrientationReviewGroup[] => {
  const groups = new Map<string, AccessoryOrientationReviewEntry[]>();
  for (const entry of entries) {
    if (entry.reviewStatus !== "pending-human-visual-review" || entry.riskFlags.length === 0) continue;
    const fingerprint = reviewFingerprint(entry);
    const members = groups.get(fingerprint) ?? [];
    members.push(entry);
    groups.set(fingerprint, members);
  }
  return [...groups.values()].map((members) => ({ representative: members[0]!, members }));
};
