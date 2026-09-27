import { z } from "zod";
import { matrix4Schema } from "./catalog.js";

const stableId = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u, "IDs must be stable lowercase identifiers");

export const anchorSlotSchema = z.enum([
  "head",
  "headwear",
  "leftHandAccessory",
  "rightHandAccessory",
]);

const anchorDefinitionSchema = z
  .object({
    id: stableId,
    slot: anchorSlotSchema,
    parent: z.enum(["torsoAssembly", "head"]),
    placementFamily: stableId,
    transform: matrix4Schema,
    reviewStatus: z.enum(["fixture-only", "verified", "rejected"]),
    evidenceIds: z.array(stableId).min(1),
    note: z.string().min(1).max(500),
  })
  .strict();

export const anchorRegistrySchema = z
  .object({
    schemaVersion: z.literal(1),
    profileId: stableId,
    coordinateSystem: z
      .object({
        units: z.literal("three-scene-units"),
        handedness: z.literal("right"),
        upAxis: z.literal("y"),
      })
      .strict(),
    source: z.literal("synthetic-ff04-fixture"),
    publishable: z.literal(false),
    anchors: z.array(anchorDefinitionSchema).length(4),
  })
  .strict()
  .superRefine((registry, context) => {
    const slots = registry.anchors.map(({ slot }) => slot);
    if (new Set(slots).size !== slots.length) {
      context.addIssue({ code: "custom", path: ["anchors"], message: "Anchor slots must be unique" });
    }
    for (const slot of anchorSlotSchema.options) {
      if (!slots.includes(slot)) {
        context.addIssue({
          code: "custom",
          path: ["anchors"],
          message: `Missing required FF-05 anchor slot: ${slot}`,
        });
      }
    }
    const headwear = registry.anchors.find(({ slot }) => slot === "headwear");
    if (headwear?.parent !== "head") {
      context.addIssue({
        code: "custom",
        path: ["anchors"],
        message: "Headwear must be parented to the head slot",
      });
    }
  });

export type AnchorSlot = z.infer<typeof anchorSlotSchema>;
export type AnchorDefinition = z.infer<typeof anchorDefinitionSchema>;
export type AnchorRegistryDocument = z.infer<typeof anchorRegistrySchema>;
