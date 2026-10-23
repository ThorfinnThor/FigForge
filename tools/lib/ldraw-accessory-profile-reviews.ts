import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AccessoryPlacementReview } from "./ldraw-accessory-placement-reviews.js";

export const ACCESSORY_PROFILE_REVIEW_SOURCE_POLICY = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;

export type AccessoryProfileMember = {
  rebrickablePartNum: string;
  ldrawFile: string;
  ldrawFileSha256: string;
};

export type AccessoryProfileFamily = {
  familyId: string;
  catalogName: string;
  detectedGripPrimitive: string;
  detectedGripLengthLdu: number;
  gripCandidatesTested: number;
  orientationCandidatesTested: number;
  selectedGripCandidateIndex: number;
  selectedOrientationIndex: number;
  reviewedAt: string;
  reviewer: string;
  evidenceReference: string;
  note: string;
  members: AccessoryProfileMember[];
};

export type AccessoryProfileReviews = {
  schemaVersion: 1;
  sourcePolicy: typeof ACCESSORY_PROFILE_REVIEW_SOURCE_POLICY;
  methodology: string;
  families: AccessoryProfileFamily[];
};

export async function readAccessoryProfileReviews(root: string): Promise<AccessoryProfileReviews> {
  const path = resolve(root, "data/curated/ldraw-accessory-profile-reviews.json");
  const parsed = JSON.parse(await readFile(path, "utf8")) as AccessoryProfileReviews;
  if (parsed.schemaVersion !== 1 || parsed.sourcePolicy !== ACCESSORY_PROFILE_REVIEW_SOURCE_POLICY) {
    throw new Error("Invalid accessory-profile review policy");
  }
  assertValidAccessoryProfileReviews(parsed);
  return parsed;
}

export function assertValidAccessoryProfileReviews(reviews: AccessoryProfileReviews): void {
  const seenFamilies = new Set<string>();
  const seenParts = new Set<string>();
  for (const family of reviews.families) {
    if (!family.familyId.trim() || seenFamilies.has(family.familyId)) {
      throw new Error(`Duplicate or empty accessory-profile family: ${family.familyId}`);
    }
    seenFamilies.add(family.familyId);
    if (
      !family.catalogName.trim()
      || !family.detectedGripPrimitive.trim()
      || family.detectedGripLengthLdu <= 0
      || family.gripCandidatesTested <= 0
      || family.orientationCandidatesTested <= 0
      || family.selectedGripCandidateIndex < 0
      || family.selectedGripCandidateIndex >= family.gripCandidatesTested
      || family.selectedOrientationIndex < 0
      || family.selectedOrientationIndex >= family.orientationCandidatesTested
      || !/^\d{4}-\d{2}-\d{2}$/u.test(family.reviewedAt)
      || !family.reviewer.trim()
      || !family.evidenceReference.trim()
      || !family.note.trim()
      || family.members.length === 0
    ) {
      throw new Error(`Invalid accessory-profile family: ${family.familyId}`);
    }
    for (const member of family.members) {
      const key = member.rebrickablePartNum.trim().toLowerCase();
      if (
        !key
        || seenParts.has(key)
        || !member.ldrawFile.startsWith("parts/")
        || !/^[a-f0-9]{64}$/u.test(member.ldrawFileSha256)
      ) {
        throw new Error(`Invalid or duplicate accessory-profile member: ${member.rebrickablePartNum}`);
      }
      seenParts.add(key);
    }
  }
}

/** Approved placement reviews equivalent to the family profile, one per member. */
export function profileMemberPlacementReviews(reviews: AccessoryProfileReviews): AccessoryPlacementReview[] {
  return reviews.families.flatMap((family) => family.members.map((member): AccessoryPlacementReview => ({
    rebrickablePartNum: member.rebrickablePartNum,
    catalogName: family.catalogName,
    ldrawFile: member.ldrawFile,
    detectedGripPrimitive: family.detectedGripPrimitive,
    detectedGripLengthLdu: family.detectedGripLengthLdu,
    gripCandidatesTested: family.gripCandidatesTested,
    orientationCandidatesTested: family.orientationCandidatesTested,
    selectedGripCandidateIndex: family.selectedGripCandidateIndex,
    selectedOrientationIndex: family.selectedOrientationIndex,
    reviewedAt: family.reviewedAt,
    reviewer: family.reviewer,
    evidenceReference: family.evidenceReference,
    note: family.note,
    decision: "approved",
  })));
}

/** Fails closed when an official LDraw file changed since the profile was reviewed. */
export async function assertProfileSourceHashes(
  reviews: AccessoryProfileReviews,
  libraryRoot: string,
): Promise<void> {
  for (const family of reviews.families) {
    for (const member of family.members) {
      const content = await readFile(resolve(libraryRoot, member.ldrawFile));
      const hash = createHash("sha256").update(content).digest("hex");
      if (hash !== member.ldrawFileSha256) {
        throw new Error(`Stale accessory-profile review for ${member.rebrickablePartNum}: ${member.ldrawFile} changed`);
      }
    }
  }
}
