import { z } from "zod";

const stableId = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u, "IDs must be stable lowercase identifiers");

const catalogEvidenceSchema = z
  .object({
    id: stableId,
    fileName: z.enum([
      "colors.csv.gz",
      "part_categories.csv.gz",
      "parts.csv.gz",
      "part_relationships.csv.gz",
      "elements.csv.gz",
    ]),
    key: z.string().min(1).max(64),
    value: z.string().min(1).max(256),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  })
  .strict();

const colorEvidenceSchema = z
  .object({
    elementId: z.string().min(1).max(32),
    rebrickableColorId: z.number().int(),
    colorName: z.string().min(1).max(80),
    rgb: z.string().regex(/^[0-9A-F]{6}$/u),
    evidenceId: stableId,
  })
  .strict();

const reviewStatusSchema = z.enum(["pending", "verified", "rejected"]);
const renderStatusSchema = z.enum(["exact", "approximate", "missing"]);

export const assortmentComponentSchema = z
  .object({
    id: stableId,
    role: z.enum(["head", "headwear", "torsoAssembly", "legsAssembly", "handAccessory"]),
    rebrickablePartNum: z.string().min(1).max(64),
    name: z.string().min(1).max(320),
    rebrickableCategoryId: z.number().int().positive(),
    rebrickableCategoryName: z.string().min(1).max(80),
    material: z.string().min(1).max(80),
    catalogEvidenceIds: z.array(stableId).min(2),
    catalogRows: z.array(catalogEvidenceSchema).min(2),
    colorEvidence: z.array(colorEvidenceSchema).min(1),
    attachmentProfile: z
      .object({
        status: reviewStatusSchema,
        allowedSlots: z.array(z.string().min(1).max(64)).min(1),
        blocker: z.string().min(1).max(320),
      })
      .strict(),
    renderStatus: renderStatusSchema,
    procurement: z
      .object({
        status: z.enum(["unverified", "verified", "blocked"]),
        bricklinkItemId: z.string().nullable(),
        bricklinkColorId: z.number().int().nonnegative().nullable(),
        blocker: z.string().min(1).max(320),
      })
      .strict(),
    humanReview: reviewStatusSchema,
    releaseStatus: z.enum(["draft", "blocked", "published"]),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.releaseStatus === "published") {
      if (value.procurement.status !== "verified") {
        context.addIssue({
          code: "custom",
          path: ["procurement", "status"],
          message: "Published FF-03 components require verified procurement",
        });
      }
      if (value.humanReview !== "verified") {
        context.addIssue({
          code: "custom",
          path: ["humanReview"],
          message: "Published FF-03 components require human review",
        });
      }
    }
  });

export const assortmentVariantSchema = z
  .object({
    id: stableId,
    headId: stableId,
    headwearId: stableId,
    torsoAssemblyId: stableId,
    legsAssemblyId: stableId,
    handAccessoryId: stableId,
    catalogEvidenceIds: z.array(stableId).min(1),
    renderStatus: renderStatusSchema,
    procurementStatus: z.enum(["unverified", "verified", "blocked"]),
    releaseStatus: z.enum(["draft", "blocked", "published"]),
    blocker: z.string().min(1).max(500),
  })
  .strict();

export const testAssortmentSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-03"),
    updatedAt: z.iso.datetime(),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    sourceLockSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    components: z.array(assortmentComponentSchema),
    variants: z.array(assortmentVariantSchema).min(20).max(40),
    excludedCandidates: z
      .array(
        z
          .object({
            rebrickablePartNum: z.string().min(1).max(64),
            category: z.string().min(1).max(80),
            reason: z.string().min(1).max(320),
          })
          .strict(),
      )
      .min(1),
    openBlockers: z.array(z.string().min(1).max(500)).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const expectedRoles = new Map([
      ["head", 5],
      ["headwear", 5],
      ["torsoAssembly", 2],
      ["legsAssembly", 2],
      ["handAccessory", 3],
    ]);
    const roleCounts = new Map<string, number>();
    const componentIds = new Set<string>();
    for (const component of value.components) {
      roleCounts.set(component.role, (roleCounts.get(component.role) ?? 0) + 1);
      if (componentIds.has(component.id)) {
        context.addIssue({ code: "custom", path: ["components"], message: "Component IDs must be unique" });
      }
      componentIds.add(component.id);
    }
    for (const [role, expected] of expectedRoles) {
      if (roleCounts.get(role) !== expected) {
        context.addIssue({
          code: "custom",
          path: ["components"],
          message: `FF-03 needs ${expected} components for ${role}`,
        });
      }
    }
    for (const [index, variant] of value.variants.entries()) {
      for (const field of ["headId", "headwearId", "torsoAssemblyId", "legsAssemblyId", "handAccessoryId"] as const) {
        if (!componentIds.has(variant[field])) {
          context.addIssue({
            code: "custom",
            path: ["variants", index, field],
            message: "Variant references an unknown FF-03 component",
          });
        }
      }
    }
  });

export type AssortmentComponent = z.infer<typeof assortmentComponentSchema>;
export type AssortmentVariant = z.infer<typeof assortmentVariantSchema>;
export type TestAssortment = z.infer<typeof testAssortmentSchema>;
