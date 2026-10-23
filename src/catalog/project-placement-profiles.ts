import profilesJson from "../../data/curated/ldraw-accessory-profile-reviews.json" with { type: "json" };

/**
 * Hand accessories whose hand position was set by the project (ADR-047) instead of being
 * documented by a connector in the official sources. The geometry is still the official
 * LDraw part; only the grip position is a reviewed project decision.
 */
const projectProfilePartNums: ReadonlySet<string> = new Set(
  profilesJson.families.flatMap(({ members }) =>
    members.map(({ rebrickablePartNum }) => rebrickablePartNum.toLocaleLowerCase("en-US"))),
);

export const hasProjectDefinedPlacement = (rebrickablePartNum: string): boolean =>
  projectProfilePartNums.has(rebrickablePartNum.toLocaleLowerCase("en-US"));
