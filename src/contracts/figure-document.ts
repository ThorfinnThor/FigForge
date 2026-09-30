import { z } from "zod";

export const FIGURE_DOCUMENT_MAX_BYTES = 64 * 1024;

export const figureDocumentSlotSchema = z.enum(["head", "headwear", "handAccessory"]);

export const figureDocumentSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("figforge-figure"),
    name: z.string().trim().min(1).max(80),
    updatedAt: z.iso.datetime(),
    selections: z
      .array(z.object({
        slot: figureDocumentSlotSchema,
        componentId: z.string().regex(/^(?:ff03-[a-z0-9-]+|catalog:(?:head|headwear|handAccessory):[a-z0-9._-]+)$/u),
      }).strict())
      .max(3),
  })
  .strict()
  .superRefine((document, context) => {
    const slots = document.selections.map(({ slot }) => slot);
    if (new Set(slots).size !== slots.length) {
      context.addIssue({ code: "custom", path: ["selections"], message: "Figure slots must be unique" });
    }
  });

export type FigureDocument = z.infer<typeof figureDocumentSchema>;
export type FigureDocumentSlot = z.infer<typeof figureDocumentSlotSchema>;
