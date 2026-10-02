import { describe, expect, it } from "vitest";
import { createFigureDocument } from "../../src/figure/figure-document.js";
import { createFigureShareLink, hasFigureShareLink, parseFigureShareLink } from "../../src/figure/share-link.js";

const document = createFigureDocument({
  head: "catalog:head:3626cpr0001",
  headwear: "catalog:headwear:25409",
  handAccessory: "ff03-hand-accessory-1",
}, "Share-Test");

describe("figure share links", () => {
  it("round-trips a validated figure document in the URL fragment", () => {
    const link = createFigureShareLink(document, "https://figforge.example/builder?lang=en");
    expect(link).toContain("#figforge=v1.");
    expect(parseFigureShareLink(link)).toEqual(document);
    expect(hasFigureShareLink(link)).toBe(true);
  });

  it("does not treat query data as a share document", () => {
    expect(hasFigureShareLink("https://figforge.example/?figforge=v1.fake")).toBe(false);
    expect(() => parseFigureShareLink("https://figforge.example/?figforge=v1.fake")).toThrow();
  });

  it("rejects tampered, unknown, and oversized links", () => {
    const link = createFigureShareLink(document, "https://figforge.example/");
    const [prefix, payload = ""] = link.split("#figforge=v1.");
    expect(() => parseFigureShareLink(`${prefix}#figforge=v2.${payload}`)).toThrow();
    expect(() => parseFigureShareLink(`${prefix}#figforge=v1.${payload.slice(0, -1)}A`)).toThrow();
    expect(() => parseFigureShareLink(`${prefix}#figforge=v1.${"A".repeat(10_000)}`)).toThrow();
  });
});
