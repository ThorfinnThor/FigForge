import { describe, expect, it } from "vitest";
import documentsJson from "../../data/curated/ff21-search-documents.json" with { type: "json" };
import lexiconJson from "../../data/curated/ff21-search-lexicon.json" with { type: "json" };
import testsetJson from "../../data/curated/ff21-search-testset.json" with { type: "json" };
import { ff21SearchLexiconSchema, searchDocumentsSchema, searchTestsetSchema } from "../../src/contracts/search-ff21.js";

describe("FF-21 search artifacts", () => {
  it("keeps all catalog-backed documents explicitly annotation-limited", () => {
    const documents = searchDocumentsSchema.parse(documentsJson);
    expect(documents.documents).toHaveLength(17);
    expect(new Set(documents.documents.map(({ componentId }) => componentId)).size).toBe(17);
    expect(documents.documents.every(({ annotation }) => annotation.status === "catalog-derived")).toBe(true);
  });

  it("keeps the German extension separate from the FF-17 base lexicon", () => {
    const lexicon = ff21SearchLexiconSchema.parse(lexiconJson);
    expect(lexicon.baseLexiconPath).toBe("data/curated/ff17-search-lexicon.json");
    expect(lexicon.entries.length).toBeGreaterThan(0);
    expect(lexicon.reviewStatus).toContain("human-review-pending");
  });

  it("contains 80 development and 80 untouched holdout cases", () => {
    const testset = searchTestsetSchema.parse(testsetJson);
    expect(testset.cases).toHaveLength(160);
    expect(testset.cases.filter(({ split }) => split === "development")).toHaveLength(80);
    expect(testset.cases.filter(({ split }) => split === "holdout")).toHaveLength(80);
    expect(testset.cases.every(({ reviewStatus }) => reviewStatus === "pending-human-relevance-review")).toBe(true);
    expect(testset.relevanceDefinition).toContain("keine E5-Proxylabels");
    const developmentQueries = new Set(testset.cases.filter(({ split }) => split === "development").map(({ query }) => query.toLocaleLowerCase("de-DE")));
    const holdoutQueries = testset.cases.filter(({ split }) => split === "holdout").map(({ query }) => query.toLocaleLowerCase("de-DE"));
    expect(holdoutQueries.some((query) => developmentQueries.has(query))).toBe(false);
    const groups = new Map<string, Set<string>>();
    for (const testCase of testset.cases) {
      const splits = groups.get(testCase.paraphraseGroup) ?? new Set<string>();
      splits.add(testCase.split);
      groups.set(testCase.paraphraseGroup, splits);
    }
    expect([...groups.values()].every((splits) => splits.size === 1)).toBe(true);
  });
});
