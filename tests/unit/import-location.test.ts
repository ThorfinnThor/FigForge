import { describe, expect, it } from "vitest";
import { consumedFigureImportPath } from "../../src/figure/import-location.js";

describe("one-time figure import locations", () => {
  it("consumes collection and share identifiers after a successful import", () => {
    expect(consumedFigureImportPath(
      "https://figforge.example/?figureId=figure-1&lang=en#figforge=v2.payload",
    )).toBe("/?lang=en");
  });

  it("preserves unrelated query parameters and fragments", () => {
    expect(consumedFigureImportPath(
      "https://figforge.example/builder?figureId=figure-1&debug=1#details",
    )).toBe("/builder?debug=1#details");
  });
});
