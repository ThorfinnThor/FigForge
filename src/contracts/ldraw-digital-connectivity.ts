import { z } from "zod";
import { matrix4Schema } from "./catalog.js";

const stableId = z.string().min(1).max(180).regex(/^[a-z0-9][a-z0-9._:-]*$/u);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/u);

const sourceFileSchema = z.object({
  path: z.string().startsWith("data/vendor/ldcad-shadow/"),
  sha256,
}).strict();

const supportedEntrySchema = z.object({
  componentId: stableId,
  role: z.enum(["head", "headwear", "handAccessory"]),
  status: z.literal("digitally-supported"),
  placementMode: z.enum(["prototype-family-origin", "snap-connector"]),
  placementTransformLdu: matrix4Schema,
  targetSlot: z.enum(["head", "headwear", "rightHandAccessory"]),
  evidenceFiles: z.array(z.string().min(1)).min(1),
  note: z.string().min(1).max(600),
}).strict();

const blockedEntrySchema = z.object({
  componentId: stableId,
  role: z.enum(["torsoAssembly", "handAccessory"]),
  status: z.literal("blocked"),
  placementMode: z.null(),
  placementTransformLdu: z.null(),
  targetSlot: z.null(),
  evidenceFiles: z.array(z.string().min(1)),
  reasonCode: z.enum(["incomplete-sales-assembly", "missing-snap-metadata"]),
  note: z.string().min(1).max(600),
}).strict();

const torsoFamilyProfileSchema = z.object({
  profileId: stableId,
  role: z.literal("torsoAssembly"),
  placementMode: z.literal("prototype-family-origin"),
  placementTransformLdu: matrix4Schema,
  targetSlot: z.literal("torsoAssembly"),
  eligibility: z.literal("official-shortcut-standard-torso-arms-hands"),
  evidenceFiles: z.array(z.string().min(1)).min(1),
  note: z.string().min(1).max(600),
}).strict();

const legsFamilyProfileSchema = z.object({
  profileId: stableId,
  role: z.literal("legsAssembly"),
  placementMode: z.literal("prototype-family-origin"),
  placementTransformLdu: matrix4Schema,
  targetSlot: z.literal("legsAssembly"),
  eligibility: z.literal("official-complete-minifig-hips-legs-title"),
  evidenceFiles: z.array(z.string().min(1)).min(1),
  note: z.string().min(1).max(600),
}).strict();

const familyProfileSchema = z.discriminatedUnion("role", [torsoFamilyProfileSchema, legsFamilyProfileSchema]);

export const ldrawDigitalConnectivitySchema = z.object({
  schemaVersion: z.literal(1),
  ticket: z.literal("FF-05/FF-16-digital-connectivity"),
  generatedAt: z.iso.date(),
  sourcePolicy: z.literal("Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."),
  publishable: z.literal(false),
  source: z.object({
    repositoryUrl: z.url(),
    revision: z.string().regex(/^[a-f0-9]{40}$/u),
    licenseId: z.literal("CC-BY-SA-4.0"),
    licenseUrl: z.url(),
    noticePath: z.literal("/licenses/LDCadShadowLibrary-NOTICE.txt"),
  }).strict(),
  sourceFiles: z.array(sourceFileSchema).length(43),
  referenceAssemblySha256: sha256,
  familyProfiles: z.array(familyProfileSchema).length(2),
  entries: z.array(z.discriminatedUnion("status", [supportedEntrySchema, blockedEntrySchema])).length(10),
  summary: z.object({
    entryCount: z.literal(10),
    digitallySupportedCount: z.literal(8),
    blockedCount: z.literal(2),
    humanInputRequired: z.literal(false),
  }).strict(),
  limitations: z.array(z.string().min(1).max(600)).min(1),
}).strict();

export type LDrawDigitalConnectivity = z.infer<typeof ldrawDigitalConnectivitySchema>;
export type LDrawDigitalConnectivityEntry = LDrawDigitalConnectivity["entries"][number];
