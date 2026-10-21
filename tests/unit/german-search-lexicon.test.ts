import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { searchCatalog, type CatalogSearchItem } from "../../src/search/catalog-search.js";
import { normalizeSearchQuery, searchLexicon } from "../../src/search/normalize-query.js";

type Part = CatalogSearchItem;

const loadCatalog = (): Part[] => {
  const parts: Part[] = [];
  for (const file of ["head", "headwear", "torso-assembly", "legs-assembly", "hand-accessory"]) {
    const catalog = JSON.parse(readFileSync(`data/generated/catalog-packages/${file}.json`, "utf8")) as { parts: Part[] };
    const runtime = JSON.parse(readFileSync(`data/generated/ldraw-runtime/${file}.json`, "utf8")) as {
      entries: Array<{ rebrickablePartNum: string; searchText: string }>;
    };
    const searchText = new Map(runtime.entries.map((entry) => [entry.rebrickablePartNum.toLowerCase(), entry.searchText]));
    for (const part of catalog.parts) {
      const text = searchText.get(part.rebrickablePartNum.toLowerCase());
      if (text !== undefined) parts.push({ ...part, searchText: text });
    }
  }
  return parts;
};

/** The ogre head only exists in the curated FF-03 assortment, which this catalog snapshot does not contain. */
const WITHOUT_CATALOG_PARTS = new Set(["term:oger"]);

describe("German search lexicon", () => {
  it("translates common German words and compounds into the English terms of the catalog", () => {
    const english = (text: string) => normalizeSearchQuery(text).englishText;
    expect(english("Polizist")).toContain("police");
    expect(english("Feuerwehrhelm")).toBe("fire helmet");
    expect(english("Kapitänshut")).toBe("captain hat");
    expect(english("Kapitaenshut")).toBe("captain hat");
    expect(english("Zauberhut")).toBe("wizard hat");
    expect(english("Brille")).toContain("glasses");
    expect(english("weiße Haare")).toContain("white");
  });

  it("leaves English queries alone", () => {
    const english = (text: string) => normalizeSearchQuery(text).englishText;
    expect(english("captain hat")).toBe("captain hat");
    expect(english("police officer")).toBe("police officer");
    expect(english("pirate")).toBe("pirate");
  });

  it("has unique entries whose English target terms are plain lowercase words", () => {
    const forms = searchLexicon.entries.flatMap(({ sourceForms }) => sourceForms.map((form) => form.toLowerCase()));
    expect(new Set(forms).size).toBe(forms.length);
    for (const entry of searchLexicon.entries.filter(({ kind }) => kind !== "ambiguous")) {
      for (const term of [...entry.targetTerms, ...entry.relatedTerms]) {
        expect(term, entry.id).toMatch(/^[a-z][a-z ]*$/u);
      }
    }
  });

  it("finds parts in the real catalog for every translating entry, so no word promises results it cannot give", () => {
    const catalog = loadCatalog();
    expect(catalog.length).toBeGreaterThan(14_000);
    const silent: string[] = [];
    for (const entry of searchLexicon.entries.filter(({ id, kind, targetTerms }) => kind !== "ambiguous" && targetTerms.length > 0 && !WITHOUT_CATALOG_PARTS.has(id))) {
      const result = searchCatalog(catalog, entry.sourceForms[0]!);
      if (result.outcome === "none") silent.push(`${entry.id} (${entry.sourceForms[0]})`);
    }
    expect(silent).toEqual([]);
  }, 60_000);
});
