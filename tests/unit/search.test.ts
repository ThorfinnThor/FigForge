import { describe, expect, it } from "vitest";
import { curatedCatalogParts } from "../../src/components/catalog-workspace-data.js";
import { mergeSemanticCatalogResults, searchCatalog } from "../../src/search/catalog-search.js";
import { normalizeSearchQuery } from "../../src/search/normalize-query.js";

describe("FF-17 base search", () => {
  it("normalizes compounds, inflections and preserves unknown words", () => {
    const query = normalizeSearchQuery("großer grüner Ogerkopf mit Hauern");

    expect(query.englishText).toContain("ogre head");
    expect(query.englishText).toContain("tusks");
    expect(query.colorNames).toEqual(["green"]);
    expect(query.categoryRole).toBe("head");
    expect(query.englishText).toBe("large green ogre head with tusks");
    expect(query.unknownTerms).toEqual([]);
  });

  it.each([
    ["gelber Kopf mit Sonnenbrille", "yellow head with sunglasses"],
    ["lächelndes Gesicht mit Sommersprossen", "smiling face with freckles"],
    ["Kopf mit Augenklappe und Bart", "head with eyepatch and beard"],
    ["rote Haare mit Pferdeschwanz", "red hair with ponytail"],
    ["schwarzer Piratenhut", "black pirate hat"],
    ["schwarzer Ritter Torso", "black knight torso"],
    ["roter Piraten Torso ohne Rüstung", "red pirate torso without armor"],
    ["schwarze Beine mit roten Stiefeln", "black legs with red boots"],
    ["Zauberstab", "magic wand"],
  ])("expands reviewed German domain query %s", (input, expected) => {
    expect(normalizeSearchQuery(input).englishText).toBe(expected);
  });

  it("keeps negation structured and does not translate ambiguous shield blindly", () => {
    const negated = normalizeSearchQuery("ohne Helm");
    const ambiguous = normalizeSearchQuery("Schild");

    expect(negated.englishText).toBe("without helmet");
    expect(negated.excludedTerms).toEqual(["helmet"]);
    expect(negated.categoryRole).toBe("headwear");
    expect(ambiguous.englishText).toBe("");
    expect(ambiguous.warningCodes).toContain("ambiguous:schild");
    expect(ambiguous.categoryRole).toBe("handAccessory");
  });

  it("uses exact IDs before lexical matches and applies category/color filters", () => {
    const idResult = searchCatalog(curatedCatalogParts, "3626cpr0001");
    const filtered = searchCatalog(curatedCatalogParts, "Köpfe schwarz");

    expect(idResult.results).toHaveLength(1);
    expect(idResult.results[0]?.component.rebrickablePartNum).toBe("3626cpr0001");
    expect(filtered.results.every(({ component }) => component.role === "head")).toBe(true);
    expect(filtered.results.map(({ component }) => component.rebrickablePartNum)).toEqual(["3626c"]);
  });

  it("matches color words without treating Reddish Brown as Red", () => {
    const parts = [
      {
        id: "reddish-brown-hair",
        role: "headwear" as const,
        rebrickablePartNum: "hair-1",
        name: "Hair Ponytail",
        rebrickableCategoryName: "Minifig Headwear",
        colorNames: ["Reddish Brown"],
      },
      {
        id: "dark-red-hair",
        role: "headwear" as const,
        rebrickablePartNum: "hair-2",
        name: "Hair Ponytail",
        rebrickableCategoryName: "Minifig Headwear",
        colorNames: ["Dark Red"],
      },
    ];

    expect(searchCatalog(parts, "rote Haare mit Pferdeschwanz").results.map(({ component }) => component.id))
      .toEqual(["dark-red-hair"]);
  });
});

describe("semantic result merge", () => {
  it("adds semantic discoveries while preserving stronger lexical matches", () => {
    const result = mergeSemanticCatalogResults(curatedCatalogParts, "grin", [
      { componentId: "ff03-head-3626cpr0495", score: 0.9 },
      { componentId: "ff03-head-3626cpr0001", score: 0.8 },
    ], { category: "head" });
    expect(result.mode).toBe("semantic");
    expect(result.results.some(({ component }) => component.id === "ff03-head-3626cpr0495")).toBe(true);
    expect(result.results[0]?.component.id).toBe("ff03-head-3626cpr0001");
  });

  it("never lets semantics weaken exact ID behavior or category filters", () => {
    const exact = mergeSemanticCatalogResults(curatedCatalogParts, "3626cpr0001", [
      { componentId: "ff03-headwear-10048", score: 1 },
    ]);
    expect(exact.mode).toBe("keyword");
    expect(exact.results.map(({ component }) => component.rebrickablePartNum)).toEqual(["3626cpr0001"]);

    const filtered = mergeSemanticCatalogResults(curatedCatalogParts, "hair", [
      { componentId: "ff03-head-3626cpr0001", score: 1 },
      { componentId: "ff03-headwear-10048", score: 0.8 },
    ], { category: "headwear" });
    expect(filtered.results.every(({ component }) => component.role === "headwear")).toBe(true);
  });

  it("does not mix the unfiltered base catalog into unknown semantic queries", () => {
    const result = mergeSemanticCatalogResults(curatedCatalogParts, "green alien face", [
      { componentId: "ff03-head-3626cpr0008", score: 0.8 },
    ], { category: "head" });
    expect(result.results.map(({ component }) => component.id)).toEqual(["ff03-head-3626cpr0008"]);
  });
});
