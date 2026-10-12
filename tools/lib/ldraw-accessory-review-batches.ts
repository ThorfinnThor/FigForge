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

const createPendingGroups = (
  entries: readonly AccessoryOrientationReviewEntry[],
  riskyOnly: boolean,
): AccessoryOrientationReviewGroup[] => {
  const groups = new Map<string, AccessoryOrientationReviewEntry[]>();
  for (const entry of entries) {
    if (
      entry.reviewStatus !== "pending-human-visual-review"
      || (riskyOnly && entry.riskFlags.length === 0)
    ) continue;
    const fingerprint = reviewFingerprint(entry);
    const members = groups.get(fingerprint) ?? [];
    members.push(entry);
    groups.set(fingerprint, members);
  }
  return [...groups.values()].map((members) => ({ representative: members[0]!, members }));
};

export const createRiskReviewGroups = (
  entries: readonly AccessoryOrientationReviewEntry[],
): AccessoryOrientationReviewGroup[] => createPendingGroups(entries, true);

export const createPendingReviewGroups = (
  entries: readonly AccessoryOrientationReviewEntry[],
): AccessoryOrientationReviewGroup[] => createPendingGroups(entries, false);

export const selectRequestedReviewGroups = (
  groups: readonly AccessoryOrientationReviewGroup[],
  requestedPartNums: readonly string[],
): AccessoryOrientationReviewGroup[] => {
  const byPartNum = new Map<string, AccessoryOrientationReviewGroup>();
  for (const group of groups) {
    for (const member of group.members) byPartNum.set(member.rebrickablePartNum, group);
  }
  const selected: AccessoryOrientationReviewGroup[] = [];
  const selectedRepresentatives = new Set<string>();
  for (const partNum of requestedPartNums) {
    const group = byPartNum.get(partNum);
    if (!group) throw new Error(`Requested accessory review part is not pending: ${partNum}`);
    const representative = group.representative.rebrickablePartNum;
    if (selectedRepresentatives.has(representative)) continue;
    selectedRepresentatives.add(representative);
    selected.push(group);
  }
  return selected;
};
