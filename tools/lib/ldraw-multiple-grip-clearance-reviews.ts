import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const MULTIPLE_GRIP_REVIEW_SOURCE_POLICY = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;

export type MultipleGripClearanceReview = {
  rebrickablePartNum: string;
  catalogName: string;
  ldrawFile: string;
  gripEvidenceFile: string;
  expectedResult: "blocked" | "passed";
};

export type MultipleGripClearanceReviews = {
  schemaVersion: 1;
  sourcePolicy: typeof MULTIPLE_GRIP_REVIEW_SOURCE_POLICY;
  methodology: string;
  reviews: MultipleGripClearanceReview[];
};

export async function readMultipleGripClearanceReviews(root: string): Promise<MultipleGripClearanceReviews> {
  const path = resolve(root, "data/curated/ldraw-multiple-grip-clearance-reviews.json");
  const parsed = JSON.parse(await readFile(path, "utf8")) as MultipleGripClearanceReviews;
  if (parsed.schemaVersion !== 1 || parsed.sourcePolicy !== MULTIPLE_GRIP_REVIEW_SOURCE_POLICY) {
    throw new Error("Invalid multiple-grip clearance review policy");
  }
  return parsed;
}
