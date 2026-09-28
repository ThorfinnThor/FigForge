import { describe, expect, it } from "vitest";
import { curatedCatalogParts } from "../../src/components/catalog-workspace-data.js";
import { searchCatalog } from "../../src/search/catalog-search.js";
import { normalizeSearchQuery } from "../../src/search/normalize-query.js";

describe("FF-17 base search", () => {
  it("normalizes compounds, inflections and preserves unknown words", () => {
    const query = normalizeSearchQuery("großer grüner Ogerkopf mit Hauern");

    expect(query.englishText).toContain("ogre head");
    expect(query.englishText).toContain("tusks");
    expect(query.colorNames).toEqual(["green"]);
    expect(query.categoryRole).toBe("head");
    expect(query.unknownTerms).toEqual(["großer", "mit"]);
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
});
