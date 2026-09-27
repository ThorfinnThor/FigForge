import { z } from "zod";
import { matrix4Schema } from "./catalog.js";

const stableId = z
  .string()
  .min(1)
  .max(180)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u, "IDs must be stable lowercase identifiers");

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const vector3Schema = z.tuple([z.number(), z.number(), z.number()]);
const roleSchema = z.enum(["head", "headwear", "torsoAssembly", "handAccessory"]);

const geometryEvidenceSchema = z
  .object({
    loadStatus: z.literal("passed"),
    meshCount: z.number().int().positive(),
    triangleCount: z.number().int().positive(),
    vertexCount: z.number().int().positive(),
    boundsLdu: z
      .object({
        min: vector3Schema,
        max: vector3Schema,
        size: vector3Schema,
      })
      .strict(),
  })
  .strict();

const placementEvidenceSchema = z
  .object({
    mode: z.enum(["prototype-family-origin", "separate-unattached-inspection"]),
    status: z.enum(["candidate-only", "unavailable"]),
    referencePartFile: z.string().min(1).nullable(),
    transformLdu: matrix4Schema.nullable(),
    evidence: z.string().min(1).max(600),
  })
  .strict();

const humanReviewSchema = z
  .object({
    status: z.enum(["pending", "blocked"]),
    requiredChecks: z.array(z.string().min(1).max(300)).min(1),
    reviewer: z.null(),
    reviewedAt: z.null(),
    evidenceReference: z.null(),
    blocker: z.string().min(1).max(600),
  })
  .strict();

const fitReviewEntrySchema = z
  .object({
    id: stableId,
    componentId: stableId,
    rebrickablePartNum: z.string().min(1).max(64),
    role: roleSchema,
    allowedSlots: z.array(z.string().min(1).max(64)).min(1),
    ldrawFile: z.string().min(1),
    ldrawUpdate: z.string().min(1),
    sourceUrl: z.url(),
    sourceFileSha256: sha256Schema,
    packedModelUrl: z.string().startsWith("/assets/ldraw/catalog/models/").endsWith(".mpd"),
    packedModelSha256: sha256Schema,
    geometry: geometryEvidenceSchema,
    placement: placementEvidenceSchema,
    preflightStatus: z.enum(["ready-for-human-fit-review", "blocked-incomplete-assembly"]),
    compatibilityDecision: z.literal("blocked"),
    humanReview: humanReviewSchema,
  })
  .strict();

const fitReviewCaseSchema = z
  .object({
    id: stableId,
    kind: z.enum([
      "head-on-reference-torso",
      "headwear-on-head",
      "accessory-in-reference-hand",
      "torso-assembly-scope",
    ]),
    componentIds: z.array(stableId).min(1).max(2),
    slot: z.string().min(1).max(64),
    referenceFiles: z.array(z.string().min(1)).min(1),
    status: z.enum(["pending-human-fit-review", "blocked-incomplete-assembly"]),
    requiredChecks: z.array(z.string().min(1).max(300)).min(1),
    result: z.null(),
  })
  .strict();

export const ldrawFitReviewSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-05/FF-16-LDraw-preflight"),
    generatedAt: z.iso.date(),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    prototypeOnly: z.literal(true),
    publishable: z.literal(false),
    sourceHashes: z
      .object({
        mappingSha256: sha256Schema,
        thumbnailIndexSha256: sha256Schema,
        prototypeModelSha256: sha256Schema,
        materialsSha256: sha256Schema,
      })
      .strict(),
    entries: z.array(fitReviewEntrySchema).length(10),
    reviewCases: z.array(fitReviewCaseSchema).length(19),
    summary: z
      .object({
        entryCount: z.literal(10),
        readyForHumanReviewCount: z.literal(9),
        blockedEntryCount: z.literal(1),
        pendingCaseCount: z.literal(18),
        blockedCaseCount: z.literal(1),
        verifiedFitCount: z.literal(0),
      })
      .strict(),
    openBlockers: z.array(z.string().min(1).max(600)).min(1),
  })
  .strict()
  .superRefine((document, context) => {
    const componentIds = document.entries.map(({ componentId }) => componentId);
    if (new Set(componentIds).size !== componentIds.length) {
      context.addIssue({ code: "custom", path: ["entries"], message: "Fit review components must be unique" });
    }
    if (document.entries.some(({ compatibilityDecision }) => compatibilityDecision !== "blocked")) {
      context.addIssue({ code: "custom", path: ["entries"], message: "Preflight evidence must not approve compatibility" });
    }
    if (document.reviewCases.some(({ result }) => result !== null)) {
      context.addIssue({ code: "custom", path: ["reviewCases"], message: "Generated review cases cannot contain human results" });
    }
  });

export type LDrawFitReviewDocument = z.infer<typeof ldrawFitReviewSchema>;
export type LDrawFitReviewEntry = z.infer<typeof fitReviewEntrySchema>;
