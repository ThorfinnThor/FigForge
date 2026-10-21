import type { FigureTemplate } from "./figure-templates.js";

export const PART_SLOTS = ["head", "headwear", "torsoAssembly", "legsAssembly", "handAccessory"] as const;

export type PartSlot = (typeof PART_SLOTS)[number];

/** Reads the LDraw number from component ids such as "catalog:head:3626bpr0027". */
export const partNumbers = (template: FigureTemplate): ReadonlyArray<{ slot: PartSlot; number: string }> => (
  PART_SLOTS.flatMap((slot) => {
    const componentId = template.document.selections.find((selection) => selection.slot === slot)?.componentId;
    const number = componentId?.split(":")[2];
    return number ? [{ slot, number }] : [];
  })
);
