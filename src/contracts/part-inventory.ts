import { z } from "zod";

export const partInventoryEntrySchema = z.object({
  rebrickablePartNum: z.string().min(1).max(80),
  rebrickableColorId: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
}).strict();

export const partInventorySchema = z.object({
  schemaVersion: z.literal(1),
  source: z.literal("rebrickable-csv"),
  importedAt: z.iso.datetime(),
  entries: z.array(partInventoryEntrySchema),
}).strict();

export type PartInventory = z.infer<typeof partInventorySchema>;
export type PartInventoryEntry = z.infer<typeof partInventoryEntrySchema>;

export const partInventoryKey = (partNum: string, colorId: number): string =>
  `${partNum.toLowerCase()}\u0000${colorId}`;
