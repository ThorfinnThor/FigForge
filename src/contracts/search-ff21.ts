import { z } from "zod";
import { searchRoleSchema } from "./search.js";

const stableId = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u, "IDs must be stable lowercase identifiers");

const sourcePolicy = z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.");

export const searchDocumentSchema = z
  .object({
    id: stableId,
    componentId: stableId,
    rebrickablePartNum: z.string().min(1).max(80),
    originalName: z.string().min(1).max(240),
    categoryName: z.string().min(1).max(120),
    categoryRole: searchRoleSchema,
    colorName: z.string().min(1).max(80),
    catalogEvidenceIds: z.array(stableId).min(1),
    englishText: z.string().min(1).max(1_000),
    annotation: z
      .object({
        status: z.literal("catalog-derived"),
        terms: z.array(z.string().min(1).max(80)).min(1),
        note: z.string().min(1).max(400),
      })
      .strict(),
  })
  .strict();

export const searchDocumentsSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-21"),
    updatedAt: z.iso.datetime(),
    sourcePolicy,
    sourceAssortmentSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    normalizerVersion: z.literal("de-en-domain-v1"),
    documentSchemaVersion: z.literal("catalog-name-category-color-v1"),
    reviewStatus: z.literal("catalog-fields-verified; annotations-human-review-pending"),
    documents: z.array(searchDocumentSchema).min(1),
  })
  .strict();

const lexiconEntrySchema = z
  .object({
    id: stableId,
    sourceForms: z.array(z.string().min(1).max(80)).min(1),
    targetTerms: z.array(z.string().min(1).max(80)).min(1),
    relatedTerms: z.array(z.string().min(1).max(80)),
    kind: z.enum(["term", "compound", "category", "color", "ambiguous"]),
    categoryRole: searchRoleSchema.nullable(),
    colorName: z.string().min(1).max(80).nullable(),
    warning: z.string().min(1).max(240).nullable(),
  })
  .strict();

export const ff21SearchLexiconSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-21"),
    normalizerVersion: z.literal("de-en-domain-v1"),
    updatedAt: z.iso.datetime(),
    sourcePolicy,
    baseLexiconPath: z.literal("data/curated/ff17-search-lexicon.json"),
    baseLexiconSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    reviewStatus: z.literal("proposed; human-review-pending"),
    entries: z.array(lexiconEntrySchema).min(1),
  })
  .strict();

const stratumSchema = z.enum([
  "german",
  "english",
  "typo-compound",
  "ambiguity-negation",
  "unfulfillable",
]);

const splitSchema = z.enum(["development", "holdout"]);
const languageSchema = z.enum(["de", "en", "mixed"]);
const domainSchema = z.enum(["head", "headwear", "torsoAssembly", "legsAssembly", "handAccessory"]);
const themeSchema = z.enum(["everyday", "fantasy", "space"]);

export const searchTestCaseSchema = z
  .object({
    id: stableId,
    split: splitSchema,
    stratum: stratumSchema,
    language: languageSchema,
    domain: domainSchema,
    theme: themeSchema,
    query: z.string().min(1).max(240),
    paraphraseGroup: stableId,
    proposedIntent: z
      .object({ componentId: stableId, reason: z.string().min(1).max(240) })
      .strict()
      .nullable(),
    reviewStatus: z.literal("pending-human-relevance-review"),
  })
  .strict();

export const searchTestsetSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-21"),
    updatedAt: z.iso.datetime(),
    sourcePolicy,
    sourceDocumentsPath: z.literal("data/curated/ff21-search-documents.json"),
    sourceDocumentsSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    holdoutPolicy: z.literal("Holdout bleibt bis zur Profilentscheidung unangetastet."),
    relevanceDefinition: z.literal("Menschliche Relevanzstufen 0/1/2; keine E5-Proxylabels."),
    cases: z.array(searchTestCaseSchema).length(160),
  })
  .strict()
  .superRefine((testset, context) => {
    const ids = testset.cases.map(({ id }) => id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", path: ["cases"], message: "FF-21 test case IDs must be unique" });
    }
    for (const split of ["development", "holdout"] as const) {
      const cases = testset.cases.filter((testCase) => testCase.split === split);
      if (cases.length !== 80) {
        context.addIssue({ code: "custom", path: ["cases"], message: `${split} must contain exactly 80 cases` });
      }
      const expected: Record<z.infer<typeof stratumSchema>, number> = {
        german: 30,
        english: 20,
        "typo-compound": 10,
        "ambiguity-negation": 10,
        unfulfillable: 10,
      };
      for (const [stratum, count] of Object.entries(expected)) {
        const actual = cases.filter((testCase) => testCase.stratum === stratum).length;
        if (actual !== count) {
          context.addIssue({ code: "custom", path: ["cases"], message: `${split}/${stratum} must contain ${count} cases` });
        }
      }
    }
    const normalizedQueries = new Map<string, Set<"development" | "holdout">>();
    const paraphraseGroups = new Map<string, Set<"development" | "holdout">>();
    for (const testCase of testset.cases) {
      const normalizedQuery = testCase.query.toLocaleLowerCase("de-DE").normalize("NFKC").replace(/\s+/gu, " ").trim();
      const querySplits = normalizedQueries.get(normalizedQuery) ?? new Set();
      querySplits.add(testCase.split);
      normalizedQueries.set(normalizedQuery, querySplits);
      const groupSplits = paraphraseGroups.get(testCase.paraphraseGroup) ?? new Set();
      groupSplits.add(testCase.split);
      paraphraseGroups.set(testCase.paraphraseGroup, groupSplits);
    }
    if ([...normalizedQueries.values()].some((splits) => splits.size > 1)) {
      context.addIssue({ code: "custom", path: ["cases"], message: "Queries must not occur in both development and holdout" });
    }
    if ([...paraphraseGroups.values()].some((splits) => splits.size > 1)) {
      context.addIssue({ code: "custom", path: ["cases"], message: "Paraphrase groups must not cross development and holdout" });
    }
  });

export type SearchDocument = z.infer<typeof searchDocumentSchema>;
export type SearchDocuments = z.infer<typeof searchDocumentsSchema>;
export type Ff21SearchLexicon = z.infer<typeof ff21SearchLexiconSchema>;
export type SearchTestCase = z.infer<typeof searchTestCaseSchema>;
export type SearchTestset = z.infer<typeof searchTestsetSchema>;
