import { z } from "zod";

export const FIGURE_DOCUMENT_MAX_BYTES = 64 * 1024;

export const figureDocumentSlotSchema = z.enum([
  "head",
  "headwear",
  "torsoAssembly",
  "legsAssembly",
  "handAccessory",
]);

const componentIdSchema = z.string().regex(/^(?:ff03-[a-z0-9-]+|catalog:(?:head|headwear|torsoAssembly|legsAssembly|handAccessory):[a-z0-9._-]+)$/u);

const figureDocumentV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("figforge-figure"),
    name: z.string().trim().min(1).max(80),
    updatedAt: z.iso.datetime(),
    selections: z
      .array(z.object({
        slot: figureDocumentSlotSchema,
        componentId: componentIdSchema,
      }).strict())
      .max(5),
  })
  .strict()
  .superRefine((document, context) => {
    const slots = document.selections.map(({ slot }) => slot);
    if (new Set(slots).size !== slots.length) {
      context.addIssue({ code: "custom", path: ["selections"], message: "Figure slots must be unique" });
    }
  });

const figureDocumentV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    kind: z.literal("figforge-figure"),
    name: z.string().trim().min(1).max(80),
    updatedAt: z.iso.datetime(),
    selections: z
      .array(z.object({
        slot: figureDocumentSlotSchema,
        componentId: componentIdSchema,
        rebrickableColorId: z.number().int().nonnegative().optional(),
      }).strict())
      .max(5),
  })
  .strict()
  .superRefine((document, context) => {
    const slots = document.selections.map(({ slot }) => slot);
    if (new Set(slots).size !== slots.length) {
      context.addIssue({ code: "custom", path: ["selections"], message: "Figure slots must be unique" });
    }
  });

/** Version-1 documents are migrated in memory; every newly serialized document is version 2. */
export const figureDocumentSchema = z.union([figureDocumentV2Schema, figureDocumentV1Schema])
  .transform((document) => document.schemaVersion === 2 ? document : ({
    ...document,
    schemaVersion: 2 as const,
    selections: document.selections.map((selection) => ({ ...selection })),
  }))
  .pipe(figureDocumentV2Schema);

export type FigureDocument = z.infer<typeof figureDocumentSchema>;
export type FigureDocumentSlot = z.infer<typeof figureDocumentSlotSchema>;
