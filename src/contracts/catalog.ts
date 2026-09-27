import { z } from "zod";

const stableId = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u, "IDs must be stable lowercase identifiers");

const internalAssetPath = z
  .string()
  .startsWith("/")
  .refine((value) => !value.startsWith("//"), "Asset paths must be same-origin paths");

export const checkStatusSchema = z.enum(["verified", "unverified", "rejected"]);
export const slotSchema = z.enum([
  "head",
  "headwear",
  "torsoAssembly",
  "legsAssembly",
  "neckAccessory",
  "leftHandAccessory",
  "rightHandAccessory",
]);

export const matrix4Schema = z.array(z.number().finite()).length(16);

export const evidenceSchema = z
  .object({
    id: stableId,
    source: z.enum(["ldraw", "rebrickable", "manual", "other"]),
    sourceUrl: z.url(),
    sourceRevision: z.string().min(1).max(256),
    retrievedAt: z.iso.datetime(),
    checkedAt: z.iso.datetime().optional(),
    status: checkStatusSchema,
    licenseId: z.string().min(1).max(128).optional(),
    note: z.string().max(2_000).optional(),
  })
  .strict();

export const renderAssetSchema = z
  .object({
    id: stableId,
    format: z.enum(["packed-mpd", "glb"]),
    url: internalAssetPath,
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    thumbnailUrl: internalAssetPath,
    appearance: z.enum(["exact", "approximate", "missing"]),
    licenseEvidenceIds: z.array(stableId).min(1),
  })
  .strict();

export const purchaseLineSchema = z
  .object({
    itemType: z.literal("P"),
    bricklinkItemId: z.string().min(1).max(64),
    bricklinkColorId: z.number().int().nonnegative(),
    quantity: z.number().int().positive().max(999),
    evidenceIds: z.array(stableId).min(1),
  })
  .strict();

export const procurementRecipeSchema = z
  .object({
    strategy: z.enum(["single-item", "assembly", "components"]),
    status: checkStatusSchema,
    lines: z.array(purchaseLineSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "verified" && value.lines.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["lines"],
        message: "A verified procurement recipe needs at least one purchase line",
      });
    }
    if (
      value.status === "verified" &&
      (value.strategy === "single-item" || value.strategy === "assembly") &&
      value.lines.length !== 1
    ) {
      context.addIssue({
        code: "custom",
        path: ["lines"],
        message: "A verified single-item or assembly recipe must resolve to exactly one purchase line",
      });
    }
    if (value.status === "rejected" && value.lines.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["lines"],
        message: "A rejected procurement recipe cannot expose purchase lines",
      });
    }
    if (value.status === "unverified" && value.lines.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["lines"],
        message: "An unverified procurement recipe cannot expose purchase lines",
      });
    }
  });

export const partVariantSchema = z
  .object({
    id: stableId,
    partId: stableId,
    displayName: z
      .object({
        de: z.string().min(1).max(160),
        en: z.string().min(1).max(160),
      })
      .strict(),
    categoryId: stableId,
    sourceIds: z
      .object({
        ldraw: z.array(z.string().min(1).max(128)),
        rebrickable: z.array(z.string().min(1).max(128)),
        bricklink: z.array(z.string().min(1).max(128)),
      })
      .strict(),
    color: z
      .object({
        internalId: stableId,
        nameDe: z.string().min(1).max(80),
        nameEn: z.string().min(1).max(80),
        displayHex: z.string().regex(/^#[0-9A-F]{6}$/u),
        ldrawCode: z.number().int().nonnegative().optional(),
        rebrickableId: z.number().int().nonnegative().optional(),
        bricklinkId: z.number().int().nonnegative().optional(),
        evidenceIds: z.array(stableId).min(1),
      })
      .strict(),
    assetId: stableId,
    attachmentProfileId: stableId,
    allowedSlots: z.array(slotSchema).min(1),
    procurement: procurementRecipeSchema,
    searchableTags: z.array(z.string().min(1).max(80)),
    catalogEvidenceIds: z.array(stableId),
    releaseStatus: z.enum(["draft", "review", "published", "blocked"]),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.releaseStatus !== "published") {
      return;
    }
    if (value.catalogEvidenceIds.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["catalogEvidenceIds"],
        message: "Published variants require catalog evidence",
      });
    }
    if (value.procurement.status !== "verified") {
      context.addIssue({
        code: "custom",
        path: ["procurement", "status"],
        message: "Published variants require a verified procurement recipe",
      });
    }
  });

export const attachmentProfileSchema = z
  .object({
    id: stableId,
    family: stableId,
    rootTransform: matrix4Schema,
    anchors: z.record(z.string().min(1), matrix4Schema),
    allowedParentFamilies: z.array(stableId),
    exclusionTags: z.array(z.string().min(1).max(80)),
    reviewStatus: checkStatusSchema,
    evidenceIds: z.array(stableId),
  })
  .strict();

export const figureDocumentSchema = z
  .object({
    schemaVersion: z.literal(1),
    catalogVersion: z.string().min(1).max(128),
    id: stableId,
    name: z.string().min(1).max(120),
    updatedAt: z.iso.datetime(),
    selections: z.partialRecord(slotSchema, z.object({ variantId: stableId }).strict()),
    cameraPreset: z.enum(["three-quarter", "front", "back"]),
  })
  .strict();

export type CheckStatus = z.infer<typeof checkStatusSchema>;
export type Slot = z.infer<typeof slotSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type RenderAsset = z.infer<typeof renderAssetSchema>;
export type PurchaseLine = z.infer<typeof purchaseLineSchema>;
export type ProcurementRecipe = z.infer<typeof procurementRecipeSchema>;
export type PartVariant = z.infer<typeof partVariantSchema>;
export type AttachmentProfile = z.infer<typeof attachmentProfileSchema>;
export type FigureDocument = z.infer<typeof figureDocumentSchema>;
