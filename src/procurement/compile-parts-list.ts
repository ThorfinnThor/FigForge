import {
  compiledPartsListSchema,
  procurementRecipeRecordSchema,
  procurementSelectionSchema,
  type CompiledPartsList,
  type CompiledPurchaseLine,
  type ProcurementRecipeRecord,
  type ProcurementSelection,
} from "../contracts/procurement.js";

export type ProcurementCompileMode = "complete" | "verified-only";

interface CompilePartsListInput {
  selections: readonly ProcurementSelection[];
  recipes: readonly ProcurementRecipeRecord[];
  mode?: ProcurementCompileMode;
}

interface MutableAggregate {
  itemType: "P";
  bricklinkItemId: string;
  bricklinkColorId: number;
  quantity: number;
  evidenceIds: Set<string>;
  sourceSelectionIds: Set<string>;
}

const lineKey = ({
  itemType,
  bricklinkItemId,
  bricklinkColorId,
}: Pick<CompiledPurchaseLine, "itemType" | "bricklinkItemId" | "bricklinkColorId">): string =>
  `${itemType}\u0000${bricklinkItemId}\u0000${bricklinkColorId}`;

const compareLines = (left: CompiledPurchaseLine, right: CompiledPurchaseLine): number =>
  left.itemType.localeCompare(right.itemType) ||
  left.bricklinkItemId.localeCompare(right.bricklinkItemId) ||
  left.bricklinkColorId - right.bricklinkColorId;

export const compilePartsList = ({
  selections: rawSelections,
  recipes: rawRecipes,
  mode = "complete",
}: CompilePartsListInput): CompiledPartsList => {
  const selections = rawSelections.map((selection) => procurementSelectionSchema.parse(selection));
  const recipes = rawRecipes.map((recipe) => procurementRecipeRecordSchema.parse(recipe));

  const selectionSlots = selections.map(({ slot }) => slot);
  if (new Set(selectionSlots).size !== selectionSlots.length) {
    throw new Error("A figure cannot contain more than one selection for the same slot");
  }

  const recipesById = new Map<string, ProcurementRecipeRecord>();
  for (const recipe of recipes) {
    if (recipesById.has(recipe.id)) {
      throw new Error(`Duplicate procurement recipe: ${recipe.id}`);
    }
    recipesById.set(recipe.id, recipe);
  }

  const aggregates = new Map<string, MutableAggregate>();
  const blockedSelections: CompiledPartsList["blockedSelections"] = [];

  for (const selection of selections) {
    const record = recipesById.get(selection.recipeId);
    if (record === undefined) {
      throw new Error(`Unknown procurement recipe: ${selection.recipeId}`);
    }
    if (record.variantId !== selection.variantId) {
      throw new Error(`Recipe ${record.id} does not belong to variant ${selection.variantId}`);
    }

    if (record.recipe.status !== "verified") {
      blockedSelections.push({
        selectionId: selection.id,
        slot: selection.slot,
        variantId: selection.variantId,
        recipeId: record.id,
        recipeStatus: record.recipe.status,
        reason: record.blocker ?? "Procurement mapping is not verified.",
      });
      continue;
    }

    for (const line of record.recipe.lines) {
      const key = lineKey(line);
      const aggregate = aggregates.get(key);
      if (aggregate === undefined) {
        aggregates.set(key, {
          itemType: line.itemType,
          bricklinkItemId: line.bricklinkItemId,
          bricklinkColorId: line.bricklinkColorId,
          quantity: line.quantity,
          evidenceIds: new Set(line.evidenceIds),
          sourceSelectionIds: new Set([selection.id]),
        });
      } else {
        aggregate.quantity += line.quantity;
        line.evidenceIds.forEach((evidenceId) => aggregate.evidenceIds.add(evidenceId));
        aggregate.sourceSelectionIds.add(selection.id);
      }
    }
  }

  const verifiedLines = [...aggregates.values()]
    .map<CompiledPurchaseLine>((line) => ({
      itemType: line.itemType,
      bricklinkItemId: line.bricklinkItemId,
      bricklinkColorId: line.bricklinkColorId,
      quantity: line.quantity,
      evidenceIds: [...line.evidenceIds].sort(),
      sourceSelectionIds: [...line.sourceSelectionIds].sort(),
    }))
    .sort(compareLines);

  const hasBlockers = blockedSelections.length > 0;
  const lines = !hasBlockers || mode === "verified-only" ? verifiedLines : [];
  const status = !hasBlockers ? "complete" : lines.length > 0 ? "partial" : "blocked";

  return compiledPartsListSchema.parse({ status, lines, blockedSelections });
};
