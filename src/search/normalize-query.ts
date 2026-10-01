import lexiconJson from "../../data/curated/ff17-search-lexicon.json" with { type: "json" };
import type { SearchLexicon, SearchLexiconEntry, SearchRole } from "../contracts/search.js";

export const searchLexicon = lexiconJson as SearchLexicon;

export type NormalizedQuery = {
  originalText: string;
  englishText: string;
  tokens: string[];
  terms: string[];
  relatedTerms: string[];
  categoryRole: SearchRole | null;
  colorNames: string[];
  excludedTerms: string[];
  idMatches: string[];
  unknownTerms: string[];
  warningCodes: string[];
  warnings: string[];
};

type Token = { value: string; index: number };

const NEGATION_WORDS = new Set(["ohne", "kein", "keine", "keinen", "keinem", "keiner", "nicht"]);
const FUNCTION_WORD_TRANSLATIONS = new Map([
  ["mit", "with"],
  ["und", "and"],
]);

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function normalizeText(text: string): string {
  return text.trim().normalize("NFKC").toLocaleLowerCase("de-DE");
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const tokenPattern = /[\p{L}\p{N}][\p{L}\p{N}._:-]*/gu;
  for (const match of text.matchAll(tokenPattern)) {
    if (match.index !== undefined) {
      tokens.push({ value: match[0], index: match.index });
    }
  }
  return tokens;
}

function entryForms(entry: SearchLexiconEntry): string[] {
  return entry.sourceForms.map((form) => normalizeText(form));
}

function findEntry(tokens: readonly Token[], start: number): { entry: SearchLexiconEntry; count: number } | null {
  const candidates = searchLexicon.entries
    .flatMap((entry) => entryForms(entry).map((form) => ({ entry, words: form.split(/\s+/u) })))
    .sort((left, right) => right.words.length - left.words.length || right.words.join(" ").length - left.words.join(" ").length);
  for (const candidate of candidates) {
    const values = tokens.slice(start, start + candidate.words.length).map(({ value }) => value);
    if (values.length === candidate.words.length && values.join(" ") === candidate.words.join(" ")) {
      return { entry: candidate.entry, count: candidate.words.length };
    }
  }
  return null;
}

function isLikelyId(token: string): boolean {
  return /\d/u.test(token) && /^[a-z0-9._:-]+$/u.test(token);
}

export function normalizeSearchQuery(input: string): NormalizedQuery {
  const originalText = input.trim();
  const normalized = normalizeText(originalText);
  const tokens = tokenize(normalized);
  const terms: string[] = [];
  const relatedTerms: string[] = [];
  const colorNames: string[] = [];
  const excludedTerms: string[] = [];
  const idMatches: string[] = [];
  const unknownTerms: string[] = [];
  const warningCodes: string[] = [];
  const warnings: string[] = [];
  const englishParts: string[] = [];
  let categoryRole: SearchRole | null = null;
  let categorySource: string | null = null;

  for (let index = 0; index < tokens.length;) {
    const token = tokens[index]?.value;
    if (!token) {
      index += 1;
      continue;
    }

    if (NEGATION_WORDS.has(token) && index + 1 < tokens.length) {
      const negated = findEntry(tokens, index + 1);
      if (negated && negated.entry.targetTerms.length > 0) {
        const target = negated.entry.targetTerms.join(" ");
        excludedTerms.push(...negated.entry.targetTerms);
        englishParts.push(`without ${target}`);
        if (negated.entry.categoryRole) {
          categoryRole = categoryRole ?? negated.entry.categoryRole;
        }
        index += negated.count + 1;
        continue;
      }
    }

    const translatedFunctionWord = FUNCTION_WORD_TRANSLATIONS.get(token);
    if (translatedFunctionWord) {
      englishParts.push(translatedFunctionWord);
      index += 1;
      continue;
    }

    const match = findEntry(tokens, index);
    if (match) {
      const { entry } = match;
      terms.push(...entry.targetTerms);
      relatedTerms.push(...entry.relatedTerms);
      englishParts.push(...entry.targetTerms);
      if (entry.colorName) {
        colorNames.push(entry.colorName.toLocaleLowerCase("en-US"));
      }
      if (entry.categoryRole) {
        if (categoryRole && categoryRole !== entry.categoryRole) {
          warningCodes.push("category-conflict");
          warnings.push("Mehrere Kategorien erkannt; der erste sichere Kategoriefilter bleibt aktiv.");
        } else {
          categoryRole = entry.categoryRole;
          categorySource = entry.id;
        }
      }
      if (entry.warning && !warningCodes.includes(entry.id)) {
        warningCodes.push(entry.id);
        warnings.push(entry.warning);
      }
      index += match.count;
      continue;
    }

    if (isLikelyId(token)) {
      idMatches.push(token);
      englishParts.push(token);
    } else {
      unknownTerms.push(token);
      englishParts.push(token);
    }
    index += 1;
  }

  if (categorySource && warningCodes.includes("category-conflict")) {
    warningCodes.splice(warningCodes.indexOf("category-conflict"), 1, "category-conflict");
  }

  return {
    originalText,
    englishText: englishParts.join(" ").replace(/\s+/gu, " ").trim(),
    tokens: tokens.map(({ value }) => value),
    terms: unique(terms),
    relatedTerms: unique(relatedTerms),
    categoryRole,
    colorNames: unique(colorNames),
    excludedTerms: unique(excludedTerms),
    idMatches: unique(idMatches),
    unknownTerms: unique(unknownTerms),
    warningCodes: unique(warningCodes),
    warnings: unique(warnings),
  };
}
