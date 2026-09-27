import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { searchFixturesSchema, searchLexiconSchema } from "../src/contracts/search.js";
import { searchCatalog } from "../src/search/catalog-search.js";
import { normalizeSearchQuery } from "../src/search/normalize-query.js";
import assortmentJson from "../data/curated/ff03-test-assortment.json" with { type: "json" };
import lexiconJson from "../data/curated/ff17-search-lexicon.json" with { type: "json" };
import fixturesJson from "../data/curated/ff17-search-fixtures.json" with { type: "json" };
import type { TestAssortment } from "../src/contracts/test-assortment.js";

const assortmentPath = resolve(process.cwd(), "data/curated/ff03-test-assortment.json");
const assortmentRaw = await readFile(assortmentPath);
const assortmentSha256 = createHash("sha256").update(assortmentRaw).digest("hex");
const lexicon = searchLexiconSchema.parse(lexiconJson);
const fixtures = searchFixturesSchema.parse(fixturesJson);
const assortment = assortmentJson as TestAssortment;

if (lexicon.sourceAssortmentSha256 !== assortmentSha256) {
  throw new Error("FF-17 lexicon is stale against the FF-03 assortment");
}
if (lexicon.normalizerVersion !== fixtures.normalizerVersion || lexicon.normalizerVersion !== "de-en-domain-v1") {
  throw new Error("FF-17 search fixtures and lexicon must share the normalizer version");
}

for (const fixture of fixtures.fixtures) {
  const normalized = normalizeSearchQuery(fixture.query);
  for (const expected of fixture.expectation.englishIncludes) {
    if (!normalized.englishText.includes(expected.toLocaleLowerCase("en-US"))) {
      throw new Error(`${fixture.id}: missing normalized text ${expected}`);
    }
  }
  if (normalized.categoryRole !== fixture.expectation.categoryRole) {
    throw new Error(`${fixture.id}: category mismatch`);
  }
  for (const color of fixture.expectation.colorNames) {
    if (!normalized.colorNames.includes(color.toLocaleLowerCase("en-US"))) {
      throw new Error(`${fixture.id}: missing color ${color}`);
    }
  }
  for (const related of fixture.expectation.relatedTerms) {
    if (!normalized.relatedTerms.includes(related.toLocaleLowerCase("en-US"))) {
      throw new Error(`${fixture.id}: missing related term ${related}`);
    }
  }
  for (const term of fixture.expectation.excludedTerms) {
    if (!normalized.excludedTerms.includes(term)) {
      throw new Error(`${fixture.id}: missing excluded term ${term}`);
    }
  }
  for (const id of fixture.expectation.idMatches) {
    if (!normalized.idMatches.includes(id.toLocaleLowerCase("de-DE"))) {
      throw new Error(`${fixture.id}: missing ID ${id}`);
    }
  }
  for (const warningCode of fixture.expectation.warningCodes) {
    if (!normalized.warningCodes.includes(warningCode)) {
      throw new Error(`${fixture.id}: missing warning ${warningCode}`);
    }
  }
  for (const unknown of fixture.expectation.unknownTerms) {
    if (!normalized.unknownTerms.includes(unknown.toLocaleLowerCase("de-DE"))) {
      throw new Error(`${fixture.id}: unknown term was dropped: ${unknown}`);
    }
  }
}

const exactIdResults = searchCatalog(assortment.components, "3626cpr0001").results;
if (exactIdResults.length !== 1 || exactIdResults[0]?.component.rebrickablePartNum !== "3626cpr0001") {
  throw new Error("FF-17 exact ID search must return only the matching part");
}

console.log(JSON.stringify({
  message: "FF-17 base search and normalizer valid",
  normalizerVersion: lexicon.normalizerVersion,
  lexiconEntryCount: lexicon.entries.length,
  fixtureCount: fixtures.fixtures.length,
  exactIdResultCount: exactIdResults.length,
  sourcePolicy: lexicon.sourcePolicy,
}));
