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
};

export type CatalogSearchResult<T extends CatalogSearchItem = CatalogSearchItem> = {
  query: NormalizedQuery;
  results: SearchResult<T>[];
  mode: "keyword" | "semantic";
};

export type SearchOptions = { category?: Exclude<CatalogCategory, "all"> };
type RankedResult<T extends CatalogSearchItem> = SearchResult<T> & {
  index: number;
  categoryMatches: boolean;
  colorsMatch: boolean;
  excluded: boolean;
  idMatches: boolean;
};

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
  const colors = componentColorNames(component).map((colorName) => colorName.toLocaleLowerCase("en-US"));
  return colorNames.every((wanted) => colors.some((color) => color.includes(wanted) || wanted.includes(color)));
}

export function searchCatalog<T extends CatalogSearchItem>(
  components: readonly T[],
  input: string,
  options: SearchOptions = {},
): CatalogSearchResult<T> {
  const query = normalizeSearchQuery(input);
  const requestedCategory = options.category ?? query.categoryRole ?? undefined;
  const hasPositiveTerms = query.terms.length > 0 || query.relatedTerms.length > 0 || query.idMatches.length > 0;
  const results = components
    .map((component, index): RankedResult<T> => {
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
  const candidateIds = new Set([...keywordById.keys(), ...semanticById.keys()]);
  const results = [...candidateIds].flatMap((componentId): SearchResult<T>[] => {
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
    }];
  }).sort((left, right) => right.score - left.score || left.component.id.localeCompare(right.component.id));

  return { query: keyword.query, results, mode: "semantic" };
}
