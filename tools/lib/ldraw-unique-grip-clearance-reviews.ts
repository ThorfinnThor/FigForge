import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const UNIQUE_GRIP_REVIEW_SOURCE_POLICY = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;

export type UniqueGripClearanceReview = {
  rebrickablePartNum: string;
  catalogName: string;
  ldrawFile: string;
  expectedResult: "blocked" | "passed";
};

export type UniqueGripClearanceReviews = {
  schemaVersion: 1;
  sourcePolicy: typeof UNIQUE_GRIP_REVIEW_SOURCE_POLICY;
  methodology: string;
  reviews: UniqueGripClearanceReview[];
};

export async function readUniqueGripClearanceReviews(root: string): Promise<UniqueGripClearanceReviews> {
  const path = resolve(root, "data/curated/ldraw-unique-grip-clearance-reviews.json");
  const parsed = JSON.parse(await readFile(path, "utf8")) as UniqueGripClearanceReviews;
  if (parsed.schemaVersion !== 1 || parsed.sourcePolicy !== UNIQUE_GRIP_REVIEW_SOURCE_POLICY) {
    throw new Error("Invalid unique-grip clearance review policy");
  }
  return parsed;
}
