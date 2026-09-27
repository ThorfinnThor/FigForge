import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ff06ProcurementDatasetSchema } from "../src/contracts/procurement.js";
import { testAssortmentSchema } from "../src/contracts/test-assortment.js";
import { compilePartsList } from "../src/procurement/compile-parts-list.js";

const assortmentPath = resolve(process.cwd(), "data/curated/ff03-test-assortment.json");
const assortmentContent = await readFile(assortmentPath, "utf8");
const assortment = testAssortmentSchema.parse(JSON.parse(assortmentContent) as unknown);
const assortmentSha256 = createHash("sha256").update(assortmentContent).digest("hex");

const dataset = ff06ProcurementDatasetSchema.parse(
  JSON.parse(
    await readFile(resolve(process.cwd(), "data/curated/ff06-procurement-recipes.json"), "utf8"),
  ) as unknown,
);

assert.equal(
  dataset.sourceAssortmentSha256,
  assortmentSha256,
  "FF-06 recipes are not locked to the checked-in FF-03 assortment",
);

const sourceVariant = assortment.variants.find(({ id }) => id === dataset.referenceFigure.sourceVariantId);
assert(sourceVariant, "FF-06 reference figure points to an unknown FF-03 variant");

const expectedVariantBySlot = new Map([
  ["head", sourceVariant.headId],
  ["headwear", sourceVariant.headwearId],
  ["torsoAssembly", sourceVariant.torsoAssemblyId],
  ["legsAssembly", sourceVariant.legsAssemblyId],
  ["rightHandAccessory", sourceVariant.handAccessoryId],
]);

for (const selection of dataset.referenceFigure.selections) {
  assert.equal(
    selection.variantId,
    expectedVariantBySlot.get(selection.slot),
    `FF-06 selection ${selection.id} does not match its FF-03 reference variant`,
  );
}

const componentsById = new Map(assortment.components.map((component) => [component.id, component]));
for (const recipe of dataset.recipes) {
  const component = componentsById.get(recipe.variantId);
  assert(component, `FF-06 recipe ${recipe.id} points to an unknown FF-03 component`);
  assert.equal(recipe.recipe.status, "unverified", "Real FF-06 recipes must remain unverified");
  assert.equal(recipe.recipe.lines.length, 0, "Unverified FF-06 recipes must not expose purchase lines");
  for (const evidenceId of recipe.catalogEvidenceIds) {
    assert(
      component.catalogEvidenceIds.includes(evidenceId),
      `FF-06 recipe ${recipe.id} contains evidence not present on its FF-03 component`,
    );
  }
}

const compiled = compilePartsList({
  selections: dataset.referenceFigure.selections,
  recipes: dataset.recipes,
});
assert.deepEqual(compiled, dataset.expectedPartsList, "FF-06 expected parts list is out of date");

console.log(
  JSON.stringify({
    message: "FF-06 procurement recipes valid",
    recipeCount: dataset.recipes.length,
    referenceSelectionCount: dataset.referenceFigure.selections.length,
    resultStatus: compiled.status,
    purchaseLineCount: compiled.lines.length,
    blockedSelectionCount: compiled.blockedSelections.length,
    sourcePolicy: dataset.sourcePolicy,
    apiUsed: false,
    mocFilesAllowed: false,
  }),
);
