import type { PartInventory } from "../contracts/part-inventory.js";
import type { FigureTemplate } from "./figure-templates.js";
import { partNumbers, type PartSlot } from "./part-numbers.js";

export type TemplatePart = { slot: PartSlot; number: string };

export type TemplateInventoryMatch = {
  template: FigureTemplate;
  owned: readonly TemplatePart[];
  missing: readonly TemplatePart[];
};

/**
 * Compares the parts of each template with the imported inventory by part number, in any colour.
 * Torsos and legs are complete assemblies in the catalog, so loose torso, arm, hand or hip parts
 * in the inventory do not match. Templates without any owned part are left out; the rest is
 * ordered by the number of owned parts, ties keep the catalog order.
 */
export const matchTemplatesToInventory = (
  templates: readonly FigureTemplate[],
  inventory: PartInventory,
): TemplateInventoryMatch[] => {
  const ownedNumbers = new Set(inventory.entries.map(({ rebrickablePartNum }) => rebrickablePartNum.toLowerCase()));
  return templates
    .map((template, index) => {
      const parts = partNumbers(template);
      return {
        index,
        match: {
          template,
          owned: parts.filter(({ number }) => ownedNumbers.has(number.toLowerCase())),
          missing: parts.filter(({ number }) => !ownedNumbers.has(number.toLowerCase())),
        },
      };
    })
    .filter(({ match }) => match.owned.length > 0)
    .sort((left, right) => right.match.owned.length - left.match.owned.length || left.index - right.index)
    .map(({ match }) => match);
};
