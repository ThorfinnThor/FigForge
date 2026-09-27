import { z } from "zod";
import { anchorSlotSchema } from "./anchor-registry.js";
import { matrix4Schema } from "./catalog.js";

const stableId = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u, "IDs must be stable lowercase identifiers");

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const internalAssetPath = z
  .string()
  .startsWith("/")
  .refine((value) => !value.startsWith("//"), "Asset paths must be same-origin paths");

export const fixturePackagePartSchema = z
  .object({
    id: stableId,
    label: z.string().min(1).max(320),
    slot: z.union([anchorSlotSchema, z.enum(["legsAssembly", "torsoAssembly"])]),
    placementFamily: stableId,
    fixtureStyle: z.enum([
      "base-legs",
      "base-torso",
      "plain",
      "grin",
      "brows",
      "headwear",
      "hand-tool",
      "hand-shield",
      "hand-staff",
    ]),
    sourceIds: z.array(stableId).min(1),
  })
  .strict();

export const fixturePackageSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-10"),
    packageId: stableId,
    kind: z.literal("synthetic-fixture"),
    publishable: z.literal(false),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    sourceHashes: z
      .object({
        assortmentSha256: hashSchema,
        sourceLockSha256: hashSchema,
        anchorRegistrySha256: hashSchema,
      })
      .strict(),
    fixture: z
      .object({
        profileId: stableId,
        source: z.literal("synthetic-ff04-fixture"),
        coordinateSystem: z
          .object({
            units: z.literal("three-scene-units"),
            handedness: z.literal("right"),
            upAxis: z.literal("y"),
          })
          .strict(),
        anchors: z.array(
          z
            .object({
              id: stableId,
              slot: anchorSlotSchema,
              parent: z.enum(["torsoAssembly", "head"]),
              placementFamily: stableId,
              transform: matrix4Schema,
            })
            .strict(),
        ),
      })
      .strict(),
    cameraPresets: z.array(z.enum(["three-quarter", "front", "back"])).length(3),
    parts: z.array(fixturePackagePartSchema).min(1),
  })
  .strict();

export const modelPackageArtifactSchema = z
  .object({
    id: stableId,
    url: internalAssetPath,
    format: z.literal("json"),
    sha256: hashSchema,
    bytes: z.number().int().positive(),
    appearance: z.literal("synthetic"),
    publishable: z.literal(false),
  })
  .strict();

export const thumbnailArtifactSchema = z
  .object({
    id: stableId,
    partId: stableId,
    url: internalAssetPath,
    format: z.literal("svg"),
    sha256: hashSchema,
    bytes: z.number().int().positive(),
    width: z.literal(256),
    height: z.literal(256),
    appearance: z.literal("synthetic"),
    publishable: z.literal(false),
  })
  .strict();

export const modelPackageIndexSchema = z
  .object({
    schemaVersion: z.literal(1),
    ticket: z.literal("FF-10"),
    sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
    generatedFrom: z
      .object({
        assortmentSha256: hashSchema,
        sourceLockSha256: hashSchema,
        anchorRegistrySha256: hashSchema,
      })
      .strict(),
    package: modelPackageArtifactSchema,
    thumbnails: z.array(thumbnailArtifactSchema).min(1),
    summary: z
      .object({
        partCount: z.number().int().nonnegative(),
        thumbnailCount: z.number().int().nonnegative(),
        publishablePackageCount: z.literal(0),
        maxThumbnailBytes: z.number().int().positive(),
      })
      .strict(),
    openBlockers: z.array(z.string().min(1).max(500)).min(1),
  })
  .strict();

export type FixturePackagePart = z.infer<typeof fixturePackagePartSchema>;
export type FixturePackage = z.infer<typeof fixturePackageSchema>;
export type ModelPackageArtifact = z.infer<typeof modelPackageArtifactSchema>;
export type ThumbnailArtifact = z.infer<typeof thumbnailArtifactSchema>;
export type ModelPackageIndex = z.infer<typeof modelPackageIndexSchema>;
