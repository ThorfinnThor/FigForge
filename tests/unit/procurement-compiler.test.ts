import { describe, expect, it } from "vitest";
import verifiedFixture from "../fixtures/ff06-verified-procurement.json" with { type: "json" };
import {
  compiledPartsListSchema,
  procurementRecipeRecordSchema,
  procurementSelectionSchema,
} from "../../src/contracts/procurement.js";
import { compilePartsList } from "../../src/procurement/compile-parts-list.js";

const recipes = verifiedFixture.recipes.map((recipe) => procurementRecipeRecordSchema.parse(recipe));
const selections = verifiedFixture.selections.map((selection) =>
  procurementSelectionSchema.parse(selection),
);
const expectedPartsList = compiledPartsListSchema.parse(verifiedFixture.expectedPartsList);

describe("procurement compiler", () => {
  it("resolves assembly strategies and matches the exact fixture parts list", () => {
    expect(compilePartsList({ recipes, selections })).toEqual(expectedPartsList);
  });

  it("aggregates the same verified accessory selected for both hands", () => {
    const result = compilePartsList({ recipes, selections });
    const toolLine = result.lines.find(({ bricklinkItemId }) => bricklinkItemId === "fixture-tool");

    expect(toolLine).toEqual({
      itemType: "P",
      bricklinkItemId: "fixture-tool",
      bricklinkColorId: 6,
      quantity: 2,
      evidenceIds: ["evidence:fixture:tool"],
      sourceSelectionIds: ["selection:fixture:left-tool", "selection:fixture:right-tool"],
    });
  });

  it("blocks the full list instead of silently exposing verified lines", () => {
    const recipesWithBlocker = recipes.map((record) =>
      record.id === "recipe:fixture:head"
        ? {
            ...record,
            recipe: { ...record.recipe, status: "unverified" as const, lines: [] },
            blocker: "Fixture mapping deliberately withheld.",
          }
        : record,
    );

    expect(compilePartsList({ recipes: recipesWithBlocker, selections })).toEqual({
      status: "blocked",
      lines: [],
      blockedSelections: [
        {
          selectionId: "selection:fixture:head",
          slot: "head",
          variantId: "variant:fixture:head",
          recipeId: "recipe:fixture:head",
          recipeStatus: "unverified",
          reason: "Fixture mapping deliberately withheld.",
        },
      ],
    });
  });

  it("only exposes a partial list after an explicit verified-only request", () => {
    const recipesWithBlocker = recipes.map((record) =>
      record.id === "recipe:fixture:head"
        ? {
            ...record,
            recipe: { ...record.recipe, status: "unverified" as const, lines: [] },
            blocker: "Fixture mapping deliberately withheld.",
          }
        : record,
    );
    const result = compilePartsList({
      recipes: recipesWithBlocker,
      selections,
      mode: "verified-only",
    });

    expect(result.status).toBe("partial");
    expect(result.lines.some(({ bricklinkItemId }) => bricklinkItemId === "fixture-head")).toBe(false);
    expect(result.blockedSelections).toHaveLength(1);
  });

  it("rejects duplicate figure slots", () => {
    const duplicateHead = {
      ...selections[0]!,
      id: "selection:fixture:duplicate-head",
    };

    expect(() =>
      compilePartsList({ recipes, selections: [...selections, duplicateHead] }),
    ).toThrowError(/same slot/u);
  });

  it("rejects unverified recipes that expose purchase lines", () => {
    const verifiedHead = recipes.find(({ id }) => id === "recipe:fixture:head")!;

    expect(() =>
      procurementRecipeRecordSchema.parse({
        ...verifiedHead,
        recipe: { ...verifiedHead.recipe, status: "unverified" },
        blocker: "Mapping is not verified.",
      }),
    ).toThrowError(/unverified procurement recipe cannot expose purchase lines/iu);
  });

  it("rejects an assembly recipe that exposes multiple purchase lines", () => {
    const verifiedLegs = recipes.find(({ id }) => id === "recipe:fixture:legs-assembly")!;

    expect(() =>
      procurementRecipeRecordSchema.parse({
        ...verifiedLegs,
        recipe: {
          ...verifiedLegs.recipe,
          lines: [...verifiedLegs.recipe.lines, ...verifiedLegs.recipe.lines],
        },
      }),
    ).toThrowError(/exactly one purchase line/iu);
  });
});
