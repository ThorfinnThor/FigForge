import { describe, expect, it } from "vitest";
import { buildBrickLinkItemCrosswalk } from "../../tools/lib/bricklink-item-crosswalk.js";

const normalized = {
  sourceLockSha256: "a".repeat(64),
  parts: [
    { partNum: "rb-code", colorVariants: [{ elementId: "1001" }] },
    { partNum: "rb-primary", colorVariants: [] },
    { partNum: "rb-alt", colorVariants: [] },
    { partNum: "rb-ambiguous", colorVariants: [{ elementId: "2001" }, { elementId: "2002" }] },
    { partNum: "rb-missing", colorVariants: [] },
  ],
};
const builderCatalog = { entries: normalized.parts.map(({ partNum }) => ({ rebrickablePartNum: partNum })) };
const curated = { components: [] };
const sources = {
  partsFileName: "Parts.txt",
  partsText: [
    "Category ID\tCategory Name\tNumber\tName\tAlternate Item Number",
    "1\tTest\tbl-code\tCode item\t",
    "1\tTest\trb-primary\tPrimary item\t",
    "1\tTest\tbl-alt\tAlternate item\trb-alt",
    "1\tTest\tbl-other\tOther item\t",
  ].join("\r\n"),
  partColorCodesFileName: "codes.txt",
  partColorCodesText: [
    "Item No\tColor\tCode",
    "bl-code\tRed\t1001",
    "bl-code\tBlue\t1001",
    "bl-code\tRed\t2001",
    "bl-other\tRed\t2002",
  ].join("\r\n"),
};

describe("BrickLink item crosswalk", () => {
  it("accepts unique official element, primary and alternate mappings without guessing", () => {
    const result = buildBrickLinkItemCrosswalk(normalized, builderCatalog, curated, sources);
    expect(result.entries.map(({ rebrickablePartNum, bricklinkItemId }) => [rebrickablePartNum, bricklinkItemId]))
      .toEqual([
        ["rb-alt", "bl-alt"],
        ["rb-code", "bl-code"],
        ["rb-primary", "rb-primary"],
      ]);
    expect(result.unresolved).toEqual([
      {
        rebrickablePartNum: "rb-ambiguous",
        reason: "ambiguous-official-crosswalk",
        candidateBricklinkItemIds: ["bl-code", "bl-other"],
        matchingElementIds: ["2001", "2002"],
      },
      {
        rebrickablePartNum: "rb-missing",
        reason: "no-official-crosswalk",
        candidateBricklinkItemIds: [],
        matchingElementIds: [],
      },
    ]);
  });

  it("rejects an element-code item that is absent from the official Parts catalog", () => {
    expect(() => buildBrickLinkItemCrosswalk(normalized, builderCatalog, curated, {
      ...sources,
      partColorCodesText: "Item No\tColor\tCode\r\nunknown\tRed\t1001\r\n",
    })).toThrow("references an unknown item");
  });
});
