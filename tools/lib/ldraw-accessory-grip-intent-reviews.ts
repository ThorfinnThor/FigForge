import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const ACCESSORY_GRIP_INTENT_REVIEW_SOURCE_POLICY = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;

export type AccessoryGripIntentReview = {
  rebrickablePartNum: string;
  catalogName: string;
  ldrawFile: string;
  detectedGripPrimitive: string;
  detectedGripLengthLdu: number;
  decision: "blocked";
  reasonCode: "detected-feature-is-not-intended-hand-grip";
  note: string;
};

export type AccessoryGripIntentReviews = {
  schemaVersion: 1;
  sourcePolicy: typeof ACCESSORY_GRIP_INTENT_REVIEW_SOURCE_POLICY;
  methodology: string;
  reviews: AccessoryGripIntentReview[];
};

export async function readAccessoryGripIntentReviews(root: string): Promise<AccessoryGripIntentReviews> {
  const path = resolve(root, "data/curated/ldraw-accessory-grip-intent-reviews.json");
  const parsed = JSON.parse(await readFile(path, "utf8")) as AccessoryGripIntentReviews;
  if (parsed.schemaVersion !== 1 || parsed.sourcePolicy !== ACCESSORY_GRIP_INTENT_REVIEW_SOURCE_POLICY) {
    throw new Error("Invalid accessory-grip intent review policy");
  }
  return parsed;
}
