import { describe, expect, it } from "vitest";
import { verifiedBrickLinkColorId } from "../../tools/lib/bricklink-color-map.js";

describe("BrickLink color mapping", () => {
  it("maps only an exact verified Rebrickable ID/name pair", () => {
    expect(verifiedBrickLinkColorId(14, "Yellow")).toBe(3);
    expect(verifiedBrickLinkColorId(0, "Black")).toBe(11);
    expect(verifiedBrickLinkColorId(14, "Not Yellow")).toBeNull();
    expect(verifiedBrickLinkColorId(9999, "[No Color/Any Color]")).toBeNull();
  });
});
