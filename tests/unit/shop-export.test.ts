import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { ShopExportEntry } from "../../src/contracts/shop-export.js";
import { shopExportPackageSchema } from "../../src/contracts/shop-export.js";
import {
  compileShopExport,
  describeShopExportCoverage,
  serializePickABrickCsv,
  serializeRebrickableCsv,
  type ShopExportLookup,
  type ShopExportSelection,
} from "../../src/procurement/shop-export.js";
import { loadShopExportLookup } from "../../src/procurement/shop-export-data.js";
import { applyAffiliateTemplate, PICK_A_BRICK_URL, REBRICKABLE_URL } from "../../src/procurement/shop-links.js";

// Synthetic fixture values; they are not real catalogue numbers.
const entries: Record<string, ShopExportEntry> = {
  "head:h1": { rebrickablePartNum: "h1", colors: [{ rebrickableColorId: 14, colorName: "Yellow", elementIds: ["1001"] }] },
  "handAccessory:a1": { rebrickablePartNum: "a1", colors: [{ rebrickableColorId: 0, colorName: "Black", elementIds: ["2001"] }] },
  "headwear:w1": {
    rebrickablePartNum: "w1",
    colors: [
      { rebrickableColorId: 0, colorName: "Black", elementIds: ["3001"] },
      { rebrickableColorId: 4, colorName: "Red", elementIds: ["3002"] },
    ],
  },
  "torsoAssembly:t1": { rebrickablePartNum: "t1", colors: [{ rebrickableColorId: 1, colorName: "Blue", elementIds: ["4001", "4002"] }] },
  "head:h2": { rebrickablePartNum: "h2", colors: [{ rebrickableColorId: 14, colorName: "Yellow", elementIds: [] }] },
  "legsAssembly:l1": { rebrickablePartNum: "l1", colors: [] },
};
const lookup: ShopExportLookup = (slot, partNum) => entries[`${slot}:${partNum}`];
const select = (slot: ShopExportSelection["slot"], partNum: string, rebrickableColorId?: number): ShopExportSelection =>
  ({
    slot,
    name: `Teil ${partNum}`,
    rebrickablePartNum: partNum,
    ...(rebrickableColorId === undefined ? {} : { rebrickableColorId }),
  });

describe("ADR-012 shop parts export", () => {
  it("exports a fully resolvable figure to both formats", () => {
    const figure = [select("head", "h1"), select("handAccessory", "a1")];
    const pickABrick = compileShopExport("lego-pick-a-brick", figure, lookup);
    const rebrickable = compileShopExport("rebrickable", figure, lookup);

    expect(pickABrick.status).toBe("complete");
    expect(serializePickABrickCsv(pickABrick)).toBe("elementId,quantity\n2001,1\n1001,1\n");
    expect(rebrickable.status).toBe("complete");
    expect(serializeRebrickableCsv(rebrickable)).toBe("Part,Color,Quantity\na1,0,1\nh1,14,1\n");
  });

  it("aggregates identical parts into one line", () => {
    const result = compileShopExport("rebrickable", [select("head", "h1"), select("head", "h1")], lookup);

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.quantity).toBe(2);
  });

  it("never guesses a colour or an element ID", () => {
    const figure = [
      select("head", "h1"),
      select("headwear", "w1"),
      select("torsoAssembly", "t1"),
      select("legsAssembly", "l1"),
      select("handAccessory", "zz"),
    ];
    const pickABrick = compileShopExport("lego-pick-a-brick", figure, lookup);
    const rebrickable = compileShopExport("rebrickable", figure, lookup);

    expect(pickABrick.status).toBe("partial");
    expect(pickABrick.blockers.map(({ reason }) => reason))
      .toEqual(["multiple-colors", "multiple-element-ids", "no-color", "not-indexed"]);
    expect(rebrickable.blockers.map(({ reason }) => reason))
      .toEqual(["multiple-colors", "no-color", "not-indexed"]);
    expect(serializeRebrickableCsv(rebrickable)).toBe("Part,Color,Quantity\nh1,14,1\nt1,1,1\n");

    expect(describeShopExportCoverage(figure, pickABrick).map(({ reason, status }) => ({ reason, status })))
      .toEqual([
        { status: "included" },
        { reason: "multiple-colors", status: "blocked" },
        { reason: "multiple-element-ids", status: "blocked" },
        { reason: "no-color", status: "blocked" },
        { reason: "not-indexed", status: "blocked" },
      ]);
    expect(describeShopExportCoverage(figure, rebrickable).map(({ reason, status }) => ({ reason, status })))
      .toEqual([
        { status: "included" },
        { reason: "multiple-colors", status: "blocked" },
        { status: "included" },
        { reason: "no-color", status: "blocked" },
        { reason: "not-indexed", status: "blocked" },
      ]);
  });

  it("exports an explicitly selected documented colour and rejects an unknown one", () => {
    const selected = compileShopExport("rebrickable", [select("headwear", "w1", 4)], lookup);
    const invalid = compileShopExport("rebrickable", [select("headwear", "w1", 999)], lookup);

    expect(selected.status).toBe("complete");
    expect(serializeRebrickableCsv(selected)).toBe("Part,Color,Quantity\nw1,4,1\n");
    expect(invalid.status).toBe("blocked");
    expect(invalid.blockers[0]?.reason).toBe("invalid-color");
  });

  it("exports inventory-backed colours to Rebrickable without inventing a Pick a Brick element ID", () => {
    const figure = [select("head", "h2")];
    const rebrickable = compileShopExport("rebrickable", figure, lookup);
    const pickABrick = compileShopExport("lego-pick-a-brick", figure, lookup);

    expect(rebrickable.status).toBe("complete");
    expect(serializeRebrickableCsv(rebrickable)).toBe("Part,Color,Quantity\nh2,14,1\n");
    expect(pickABrick.status).toBe("blocked");
    expect(pickABrick.blockers[0]?.reason).toBe("no-element-id");
  });

  it("reports empty and fully blocked figures", () => {
    expect(compileShopExport("rebrickable", [], lookup).status).toBe("empty");
    const blocked = compileShopExport("lego-pick-a-brick", [select("legsAssembly", "l1")], lookup);
    expect(blocked.status).toBe("blocked");
    expect(serializePickABrickCsv(blocked)).toBe("elementId,quantity\n");
  });

  it("applies only a valid https partner template and otherwise links directly", () => {
    const encoded = encodeURIComponent(PICK_A_BRICK_URL);

    expect(applyAffiliateTemplate(PICK_A_BRICK_URL, undefined)).toEqual({ href: PICK_A_BRICK_URL, affiliate: false });
    expect(applyAffiliateTemplate(PICK_A_BRICK_URL, "https://partner.example/?id=PLACEHOLDER"))
      .toEqual({ href: PICK_A_BRICK_URL, affiliate: false });
    expect(applyAffiliateTemplate(PICK_A_BRICK_URL, "http://partner.example/?u={url}"))
      .toEqual({ href: PICK_A_BRICK_URL, affiliate: false });
    expect(applyAffiliateTemplate(PICK_A_BRICK_URL, "https://partner.example/?u={url}"))
      .toEqual({ href: `https://partner.example/?u=${encoded}`, affiliate: true });
  });

  it("opens the signed-in user's Rebrickable part lists", () => {
    expect(REBRICKABLE_URL).toBe("https://rebrickable.com/users/_ME_/partlists/");
  });

  it("keeps the real printed part number for parts shown as geometry without print", { timeout: 15_000 }, async () => {
    const runtime = JSON.parse(await readFile("data/generated/ldraw-runtime/torso-assembly.json", "utf8")) as {
      entries: Array<{ rebrickablePartNum: string; geometryFallback: unknown }>;
    };
    const unprinted = runtime.entries.filter(({ geometryFallback }) => geometryFallback !== null);
    const exportPackage = shopExportPackageSchema.parse(
      JSON.parse(await readFile("data/generated/shop-export/torso-assembly.json", "utf8")),
    );
    const exportPartNums = new Set(exportPackage.entries.map(({ rebrickablePartNum }) => rebrickablePartNum));

    expect(unprinted.length).toBeGreaterThan(0);
    for (const { rebrickablePartNum } of unprinted) expect(exportPartNums.has(rebrickablePartNum)).toBe(true);

    const realLookup = await loadShopExportLookup(["torsoAssembly"]);
    const printed = unprinted.find(({ rebrickablePartNum }) => realLookup("torsoAssembly", rebrickablePartNum)?.colors.length === 1);
    expect(printed).toBeDefined();
    const result = compileShopExport("rebrickable", [select("torsoAssembly", printed!.rebrickablePartNum)], realLookup);
    expect(result.lines[0]?.rebrickablePartNum).toBe(printed!.rebrickablePartNum);
  });

  it("covers every builder-ready part with an export entry", async () => {
    const roles = ["head", "headwear", "torsoAssembly", "legsAssembly", "handAccessory"] as const;
    const files = ["head", "headwear", "torso-assembly", "legs-assembly", "hand-accessory"];
    for (const [index, role] of roles.entries()) {
      const runtime = JSON.parse(await readFile(`data/generated/ldraw-runtime/${files[index]}.json`, "utf8")) as {
        entries: Array<{ rebrickablePartNum: string }>;
      };
      const realLookup = await loadShopExportLookup([role]);
      for (const { rebrickablePartNum } of runtime.entries) {
        expect(realLookup(role, rebrickablePartNum), `${role}:${rebrickablePartNum}`).toBeDefined();
      }
    }
  });
});
