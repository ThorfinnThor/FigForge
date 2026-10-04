import type { CatalogCategory } from "../components/catalog-workspace-data.js";
import { normalizeSearchQuery, type NormalizedQuery } from "./normalize-query.js";

export type CatalogSearchItem = {
  id: string;
  role: Exclude<CatalogCategory, "all">;
  rebrickablePartNum: string;
  name: string;
  rebrickableCategoryName: string;
  colorNames?: readonly string[];
  colorEvidence?: readonly { colorName: string }[];
};

export type SearchResult<T extends CatalogSearchItem = CatalogSearchItem> = {
  component: T;
  score: number;
  matchedTerms: string[];
  matchTier: "direct" | "suggestion";
};

export type CatalogSearchResult<T extends CatalogSearchItem = CatalogSearchItem> = {
  query: NormalizedQuery;
  results: SearchResult<T>[];
  mode: "keyword" | "semantic";
  outcome: "direct" | "suggestions" | "none";
};

export type SearchOptions = { category?: Exclude<CatalogCategory, "all"> };
type RankedResult<T extends CatalogSearchItem> = SearchResult<T> & {
  index: number;
  categoryMatches: boolean;
  colorsMatch: boolean;
  excluded: boolean;
  idMatches: boolean;
};

// Calibrated on the human-reviewed development set (relevance >= 1: recall
// 94.7%, precision 71.7%) and checked once on the holdout (recall 78.6%,
// precision 66.7%). A semantic score is never promoted to a direct match because the reviewed
// score distributions overlap even at the top end.
export const SEMANTIC_SUGGESTION_MIN_SCORE = 0.42;
export const SEMANTIC_SUGGESTION_LIMIT = 3;

function outcomeFor<T extends CatalogSearchItem>(results: readonly SearchResult<T>[]): CatalogSearchResult<T>["outcome"] {
  if (results.some(({ matchTier }) => matchTier === "direct")) return "direct";
  return results.length > 0 ? "suggestions" : "none";
}

const componentColorNames = (component: CatalogSearchItem): readonly string[] =>
  component.colorNames ?? component.colorEvidence?.map(({ colorName }) => colorName) ?? [];

function documentText(component: CatalogSearchItem): string {
  return [
    component.id,
    component.rebrickablePartNum,
    component.name,
    component.rebrickableCategoryName,
    component.role,
    ...componentColorNames(component),
  ].join(" ").toLocaleLowerCase("en-US");
}

function colorMatches(component: CatalogSearchItem, colorNames: readonly string[]): boolean {
  const colors: string[][] = componentColorNames(component).map((colorName) => (
    colorName.toLocaleLowerCase("en-US").match(/[\p{L}\p{N}]+/gu) ?? []
  ));
  return colorNames.every((wanted) => {
    const wantedTokens: string[] = wanted.toLocaleLowerCase("en-US").match(/[\p{L}\p{N}]+/gu) ?? [];
    return wantedTokens.length > 0 && colors.some((colorTokens) => (
      wantedTokens.every((token) => colorTokens.includes(token))
    ));
  });
}

export function searchCatalog<T extends CatalogSearchItem>(
  components: readonly T[],
  input: string,
  options: SearchOptions = {},
): CatalogSearchResult<T> {
  const query = normalizeSearchQuery(input);
  const requestedCategory = options.category ?? query.categoryRole ?? undefined;
  const hasUserText = input.trim().length > 0;
  const literalTerms = [...query.terms, ...query.unknownTerms];
  const hasPositiveTerms = literalTerms.length > 0 || query.relatedTerms.length > 0 || query.idMatches.length > 0;
  const results = components
    .map((component, index): RankedResult<T> => {
      const text = documentText(component);
      const exactId = query.idMatches.some((id) => component.rebrickablePartNum.toLocaleLowerCase("en-US") === id);
      const idContained = query.idMatches.some((id) => text.includes(id));
      const categoryMatches = !requestedCategory || component.role === requestedCategory;
      const colorsMatch = colorMatches(component, query.colorNames);
      const excluded = query.excludedTerms.some((term) => text.includes(term));
      const matchedTerms = literalTerms.filter((term) => text.includes(term));
      const matchedRelatedTerms = query.relatedTerms.filter((term) => text.includes(term));
      const hasCompleteLexicalEvidence = literalTerms.length > 0
        && literalTerms.every((term) => text.includes(term));
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
        matchTier: !hasUserText || exactId || hasCompleteLexicalEvidence ? "direct" : "suggestion",
        index,
        categoryMatches,
        colorsMatch,
        excluded,
        idMatches: query.idMatches.length === 0 || idContained,
      };
    })
    .filter(({ categoryMatches, colorsMatch, excluded, idMatches, score }) => (
      categoryMatches
      && colorsMatch
      && !excluded
      && (!hasUserText || (hasPositiveTerms && idMatches && score > 0))
    ))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ component, score, matchedTerms, matchTier }) => ({ component, score, matchedTerms, matchTier }));

  return { query, results, mode: "keyword", outcome: outcomeFor(results) };
}

export function mergeSemanticCatalogResults<T extends CatalogSearchItem>(
  components: readonly T[],
  input: string,
  semanticHits: readonly { componentId: string; score: number }[],
  options: SearchOptions = {},
): CatalogSearchResult<T> {
  const keyword = searchCatalog(components, input, options);
  if (input.trim().length === 0 || keyword.query.idMatches.length > 0) return keyword;

  const requestedCategory = options.category ?? keyword.query.categoryRole ?? undefined;
  const componentById = new Map(components.map((component) => [component.id, component]));
  const keywordById = new Map(keyword.results
    .filter(({ score }) => score > 0)
    .map((result) => [result.component.id, result]));
  const semanticById = new Map(semanticHits.map((hit) => [hit.componentId, hit.score]));
  const candidateIds = new Set([
    ...keywordById.keys(),
    ...semanticHits
      .filter(({ score }) => score >= SEMANTIC_SUGGESTION_MIN_SCORE)
      .map(({ componentId }) => componentId),
  ]);
  const rankedResults = [...candidateIds].flatMap((componentId): SearchResult<T>[] => {
    const component = componentById.get(componentId);
    if (!component || (requestedCategory && component.role !== requestedCategory)) return [];
    const text = documentText(component);
    if (!colorMatches(component, keyword.query.colorNames)) return [];
    if (keyword.query.excludedTerms.some((term) => text.includes(term))) return [];
    const lexical = keywordById.get(componentId);
    const semanticScore = semanticById.get(componentId) ?? 0;
    return [{
      component,
      score: (lexical?.score ?? 0) + semanticScore * 8,
      matchedTerms: lexical?.matchedTerms ?? [],
      matchTier: lexical?.matchTier ?? "suggestion",
    }];
  }).sort((left, right) => right.score - left.score || left.component.id.localeCompare(right.component.id));
  const results = [
    ...rankedResults.filter(({ matchTier }) => matchTier === "direct"),
    ...rankedResults
      .filter(({ matchTier }) => matchTier === "suggestion")
      .slice(0, SEMANTIC_SUGGESTION_LIMIT),
  ];

  return { query: keyword.query, results, mode: "semantic", outcome: outcomeFor(results) };
}
