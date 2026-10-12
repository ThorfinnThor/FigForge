import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const ACCESSORY_PLACEMENT_REVIEW_SOURCE_POLICY = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;

type AccessoryPlacementReviewEvidence = {
  rebrickablePartNum: string;
  catalogName: string;
  ldrawFile: string;
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
};

export type AccessoryPlacementReview = AccessoryPlacementReviewEvidence & (
  | { decision: "approved"; reasonCode?: never }
  | { decision: "blocked"; reasonCode: "visually-implausible-placement" }
);

export type AccessoryPlacementReviews = {
  schemaVersion: 1;
  sourcePolicy: typeof ACCESSORY_PLACEMENT_REVIEW_SOURCE_POLICY;
  methodology: string;
  reviews: AccessoryPlacementReview[];
};

export async function readAccessoryPlacementReviews(root: string): Promise<AccessoryPlacementReviews> {
  const path = resolve(root, "data/curated/ldraw-accessory-placement-reviews.json");
  const parsed = JSON.parse(await readFile(path, "utf8")) as AccessoryPlacementReviews;
  if (parsed.schemaVersion !== 1 || parsed.sourcePolicy !== ACCESSORY_PLACEMENT_REVIEW_SOURCE_POLICY) {
    throw new Error("Invalid accessory-placement review policy");
  }
  return parsed;
}
