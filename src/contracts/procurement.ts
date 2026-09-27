import { z } from "zod";
import {
  checkStatusSchema,
  procurementRecipeSchema,
  purchaseLineSchema,
  slotSchema,
} from "./catalog.js";

const stableId = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u, "IDs must be stable lowercase identifiers");

export const procurementRecipeRecordSchema = z
  .object({
    id: stableId,
    variantId: stableId,
    recipe: procurementRecipeSchema,
    catalogEvidenceIds: z.array(stableId).min(1),
    blocker: z.string().min(1).max(500).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.recipe.status === "verified" && value.blocker !== null) {
      context.addIssue({
        code: "custom",
        path: ["blocker"],
        message: "Verified procurement recipes cannot retain a blocker",
      });
    }
    if (value.recipe.status !== "verified" && value.blocker === null) {
      context.addIssue({
        code: "custom",
        path: ["blocker"],
        message: "Unverified or rejected procurement recipes need an explicit blocker",
      });
    }
  });

export const procurementSelectionSchema = z
  .object({
    id: stableId,
    slot: slotSchema,
    variantId: stableId,
    recipeId: stableId,
  })
  .strict();

export const compiledPurchaseLineSchema = purchaseLineSchema.extend({
  sourceSelectionIds: z.array(stableId).min(1),
});

export const blockedProcurementSelectionSchema = z
  .object({
    selectionId: stableId,
    slot: slotSchema,
    variantId: stableId,
    recipeId: stableId,
    recipeStatus: checkStatusSchema,
    reason: z.string().min(1).max(500),
  })
  .strict();

export const compiledPartsListSchema = z
  .object({
    status: z.enum(["complete", "partial", "blocked"]),
    lines: z.array(compiledPurchaseLineSchema),
    blockedSelections: z.array(blockedProcurementSelectionSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "complete" && value.blockedSelections.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["blockedSelections"],
        message: "A complete parts list cannot contain blocked selections",
      });
    }
    if (value.status === "blocked" && value.lines.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["lines"],
        message: "A blocked full export cannot expose partial purchase lines",
      });
    }
    if (value.status === "partial" && (value.lines.length === 0 || value.blockedSelections.length === 0)) {
      context.addIssue({
        code: "custom",
        path: [],
        message: "A partial parts list needs both verified lines and visible blockers",
      });
    }
  });

export const ff06ProcurementDatasetSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-06"),
    updatedAt: z.iso.datetime(),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    sourceAssortmentSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    recipes: z.array(procurementRecipeRecordSchema).min(1),
    referenceFigure: z
      .object({
        id: stableId,
        sourceVariantId: stableId,
        selections: z.array(procurementSelectionSchema).min(1),
      })
      .strict(),
    expectedPartsList: compiledPartsListSchema,
    openBlockers: z.array(z.string().min(1).max(500)).min(1),
  })
  .strict()
  .superRefine((dataset, context) => {
    const recipeIds = dataset.recipes.map(({ id }) => id);
    if (new Set(recipeIds).size !== recipeIds.length) {
      context.addIssue({ code: "custom", path: ["recipes"], message: "Recipe IDs must be unique" });
    }

    const selectionIds = dataset.referenceFigure.selections.map(({ id }) => id);
    if (new Set(selectionIds).size !== selectionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["referenceFigure", "selections"],
        message: "Selection IDs must be unique",
      });
    }

    const slots = dataset.referenceFigure.selections.map(({ slot }) => slot);
    if (new Set(slots).size !== slots.length) {
      context.addIssue({
        code: "custom",
        path: ["referenceFigure", "selections"],
        message: "A reference figure cannot select the same slot twice",
      });
    }

    const recipesById = new Map(dataset.recipes.map((recipe) => [recipe.id, recipe]));
    for (const [index, selection] of dataset.referenceFigure.selections.entries()) {
      const recipe = recipesById.get(selection.recipeId);
      if (recipe === undefined) {
        context.addIssue({
          code: "custom",
          path: ["referenceFigure", "selections", index, "recipeId"],
          message: "Selection references an unknown procurement recipe",
        });
      } else if (recipe.variantId !== selection.variantId) {
        context.addIssue({
          code: "custom",
          path: ["referenceFigure", "selections", index, "variantId"],
          message: "Selection and procurement recipe must reference the same variant",
        });
      }
    }
  });

export type ProcurementRecipeRecord = z.infer<typeof procurementRecipeRecordSchema>;
export type ProcurementSelection = z.infer<typeof procurementSelectionSchema>;
export type CompiledPurchaseLine = z.infer<typeof compiledPurchaseLineSchema>;
export type CompiledPartsList = z.infer<typeof compiledPartsListSchema>;
export type Ff06ProcurementDataset = z.infer<typeof ff06ProcurementDatasetSchema>;
