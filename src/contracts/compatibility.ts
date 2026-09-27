import { z } from "zod";

const stableId = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u, "IDs must be stable lowercase identifiers");

export const compatibilitySlotSchema = z.enum([
  "head",
  "headwear",
  "torsoAssembly",
  "legsAssembly",
  "leftHandAccessory",
  "rightHandAccessory",
]);

const componentRuleSchema = z
  .object({
    id: stableId,
    componentId: stableId,
    allowedSlots: z.array(compatibilitySlotSchema).min(1),
    decision: z.literal("blocked"),
    reasonCode: z.literal("attachment-unverified"),
    evidenceIds: z.array(stableId).min(1),
    message: z.string().min(1).max(500),
  })
  .strict();

const fixtureRuleSchema = z
  .object({
    id: stableId,
    slot: compatibilitySlotSchema,
    placementFamily: stableId,
    decision: z.literal("warning"),
    reasonCode: z.literal("fixture-only"),
    evidenceIds: z.array(stableId).min(1),
    message: z.string().min(1).max(500),
  })
  .strict();

const exclusionRuleSchema = z
  .object({
    id: stableId,
    matchType: z.enum(["rebrickable-part-number", "family"]),
    value: z.string().min(1).max(128),
    decision: z.literal("blocked"),
    reasonCode: z.enum(["non-standard-body-system", "unsupported-flexible-part", "unverified-neck-geometry"]),
    evidenceIds: z.array(stableId).min(1),
    message: z.string().min(1).max(500),
  })
  .strict();

const slotPolicySchema = z
  .object({
    id: stableId,
    slot: compatibilitySlotSchema,
    occupancy: z.literal("single"),
    onConflict: z.literal("replace"),
    decision: z.literal("warning"),
    message: z.string().min(1).max(500),
  })
  .strict();

export const compatibilityMatrixSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-16"),
    updatedAt: z.iso.datetime(),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    sourceAssortmentSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    sourceAnchorRegistrySha256: z.string().regex(/^[a-f0-9]{64}$/u),
    profileId: stableId,
    publishable: z.literal(false),
    defaultDecision: z.literal("blocked"),
    componentRules: z.array(componentRuleSchema).min(1),
    fixtureRules: z.array(fixtureRuleSchema).min(1),
    exclusionRules: z.array(exclusionRuleSchema).min(1),
    slotPolicies: z.array(slotPolicySchema).min(1),
  })
  .strict()
  .superRefine((matrix, context) => {
    const ids = [
      ...matrix.componentRules.map(({ id }) => id),
      ...matrix.fixtureRules.map(({ id }) => id),
      ...matrix.exclusionRules.map(({ id }) => id),
      ...matrix.slotPolicies.map(({ id }) => id),
    ];
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", path: ["componentRules"], message: "Compatibility rule IDs must be unique" });
    }
    const componentIds = matrix.componentRules.map(({ componentId }) => componentId);
    if (new Set(componentIds).size !== componentIds.length) {
      context.addIssue({ code: "custom", path: ["componentRules"], message: "Component rules must be unique" });
    }
  });

export type CompatibilitySlot = z.infer<typeof compatibilitySlotSchema>;
export type CompatibilityMatrix = z.infer<typeof compatibilityMatrixSchema>;
export type CompatibilityDecision = {
  decision: "warning" | "blocked";
  reasonCode: string;
  message: string;
  sourceRuleId: string;
};
