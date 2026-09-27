import { z } from "zod";

const stableId = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u, "IDs must be stable lowercase identifiers");

export const searchRoleSchema = z.enum([
  "head",
  "headwear",
  "torsoAssembly",
  "legsAssembly",
  "handAccessory",
]);

const lexiconKindSchema = z.enum(["term", "compound", "category", "color", "ambiguous"]);

export const searchLexiconEntrySchema = z
  .object({
    id: stableId,
    sourceForms: z.array(z.string().min(1).max(80)).min(1),
    targetTerms: z.array(z.string().min(1).max(80)),
    relatedTerms: z.array(z.string().min(1).max(80)),
    kind: lexiconKindSchema,
    categoryRole: searchRoleSchema.nullable(),
    colorName: z.string().min(1).max(80).nullable(),
    warning: z.string().min(1).max(240).nullable(),
  })
  .strict();

export const searchLexiconSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-17"),
    normalizerVersion: z.literal("de-en-domain-v1"),
    updatedAt: z.iso.datetime(),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    sourceAssortmentSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    entries: z.array(searchLexiconEntrySchema).min(1),
  })
  .strict()
  .superRefine((lexicon, context) => {
    const ids = lexicon.entries.map(({ id }) => id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", path: ["entries"], message: "Search lexicon IDs must be unique" });
    }
    const forms = lexicon.entries.flatMap(({ sourceForms }) => sourceForms.map((form) => form.toLocaleLowerCase("de-DE")));
    if (new Set(forms).size !== forms.length) {
      context.addIssue({ code: "custom", path: ["entries"], message: "Search lexicon source forms must be unique" });
    }
  });

const fixtureExpectationSchema = z
  .object({
    englishIncludes: z.array(z.string().min(1).max(160)),
    relatedTerms: z.array(z.string().min(1).max(80)),
    categoryRole: searchRoleSchema.nullable(),
    colorNames: z.array(z.string().min(1).max(80)),
    excludedTerms: z.array(z.string().min(1).max(80)),
    idMatches: z.array(z.string().min(1).max(80)),
    warningCodes: z.array(z.string().min(1).max(80)),
    unknownTerms: z.array(z.string().min(1).max(80)),
  })
  .strict();

export const searchFixtureSchema = z
  .object({
    id: stableId,
    query: z.string().min(1).max(240),
    expectation: fixtureExpectationSchema,
  })
  .strict();

export const searchFixturesSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-17"),
    normalizerVersion: z.literal("de-en-domain-v1"),
    updatedAt: z.iso.datetime(),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    fixtures: z.array(searchFixtureSchema).min(1),
  })
  .strict();

export type SearchRole = z.infer<typeof searchRoleSchema>;
export type SearchLexiconEntry = z.infer<typeof searchLexiconEntrySchema>;
export type SearchLexicon = z.infer<typeof searchLexiconSchema>;
export type SearchFixture = z.infer<typeof searchFixtureSchema>;
export type SearchFixtures = z.infer<typeof searchFixturesSchema>;
