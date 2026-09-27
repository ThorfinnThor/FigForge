import type { AssortmentComponent } from "../contracts/test-assortment.js";
import type { CatalogCategory } from "../components/catalog-workspace-data.js";
import { normalizeSearchQuery, type NormalizedQuery } from "./normalize-query.js";

export type SearchResult = {
  component: AssortmentComponent;
  score: number;
  matchedTerms: string[];
};

export type CatalogSearchResult = {
  query: NormalizedQuery;
  results: SearchResult[];
  mode: "keyword";
};

type SearchOptions = { category?: Exclude<CatalogCategory, "all"> };
type RankedResult = SearchResult & {
  index: number;
  categoryMatches: boolean;
  colorsMatch: boolean;
  excluded: boolean;
  idMatches: boolean;
};

function documentText(component: AssortmentComponent): string {
  return [
    component.id,
    component.rebrickablePartNum,
    component.name,
    component.rebrickableCategoryName,
    component.role,
    ...component.colorEvidence.map(({ colorName }) => colorName),
  ].join(" ").toLocaleLowerCase("en-US");
}

function colorMatches(component: AssortmentComponent, colorNames: readonly string[]): boolean {
  const colors = component.colorEvidence.map(({ colorName }) => colorName.toLocaleLowerCase("en-US"));
  return colorNames.every((wanted) => colors.some((color) => color.includes(wanted) || wanted.includes(color)));
}

export function searchCatalog(
  components: readonly AssortmentComponent[],
  input: string,
  options: SearchOptions = {},
): CatalogSearchResult {
  const query = normalizeSearchQuery(input);
  const requestedCategory = options.category ?? query.categoryRole ?? undefined;
  const hasPositiveTerms = query.terms.length > 0 || query.relatedTerms.length > 0 || query.idMatches.length > 0;
  const results = components
    .map((component, index): RankedResult => {
      const text = documentText(component);
      const exactId = query.idMatches.some((id) => component.rebrickablePartNum.toLocaleLowerCase("en-US") === id);
      const idContained = query.idMatches.some((id) => text.includes(id));
      const categoryMatches = !requestedCategory || component.role === requestedCategory;
      const colorsMatch = colorMatches(component, query.colorNames);
      const excluded = query.excludedTerms.some((term) => text.includes(term));
      const matchedTerms = query.terms.filter((term) => text.includes(term));
      const matchedRelatedTerms = query.relatedTerms.filter((term) => text.includes(term));
      let score = 0;
      if (exactId) score += 1000;
      else if (idContained) score += 500;
      score += matchedTerms.length * 10;
      score += matchedRelatedTerms.length * 3;
      if (text.includes(query.englishText)) score += 4;
      return {
        component,
        score,
        matchedTerms: [...matchedTerms, ...matchedRelatedTerms],
        index,
        categoryMatches,
        colorsMatch,
        excluded,
        idMatches: query.idMatches.length === 0 || idContained,
      };
    })
    .filter(({ categoryMatches, colorsMatch, excluded, idMatches, score }) => (
      categoryMatches && colorsMatch && !excluded && (!hasPositiveTerms || (idMatches && score > 0))
    ))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ component, score, matchedTerms }) => ({ component, score, matchedTerms }));

  return { query, results, mode: "keyword" };
}
