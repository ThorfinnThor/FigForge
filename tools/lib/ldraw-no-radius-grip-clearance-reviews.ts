import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const NO_RADIUS_GRIP_REVIEW_SOURCE_POLICY = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;

export type NoRadiusGripClearanceReview = {
  rebrickablePartNum: string;
  catalogName: string;
  ldrawFile: string;
  gripEvidenceFile: string;
  expectedResult: "blocked" | "passed";
};

export type NoRadiusGripClearanceReviews = {
  schemaVersion: 1;
  sourcePolicy: typeof NO_RADIUS_GRIP_REVIEW_SOURCE_POLICY;
  methodology: string;
  auditedQueueCount: 270;
  uniqueDocumentedGripCount: 23;
  withoutUniqueDocumentedGripCount: 247;
  reviews: NoRadiusGripClearanceReview[];
};

export async function readNoRadiusGripClearanceReviews(root: string): Promise<NoRadiusGripClearanceReviews> {
  const path = resolve(root, "data/curated/ldraw-no-radius-grip-clearance-reviews.json");
  const parsed = JSON.parse(await readFile(path, "utf8")) as NoRadiusGripClearanceReviews;
  if (parsed.schemaVersion !== 1 || parsed.sourcePolicy !== NO_RADIUS_GRIP_REVIEW_SOURCE_POLICY) {
    throw new Error("Invalid no-radius grip clearance review policy");
  }
  return parsed;
}
