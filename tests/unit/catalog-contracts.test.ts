import { describe, expect, it } from "vitest";
import {
  figureDocumentSchema,
  partVariantSchema,
  procurementRecipeSchema,
} from "../../src/contracts/catalog.js";

const validPublishedVariant = {
  id: "variant:head:test-1",
  partId: "part:head:test",
  displayName: { de: "Geprüfter Testkopf", en: "Verified test head" },
  categoryId: "category:head",
  sourceIds: {
    ldraw: ["test.dat"],
    rebrickable: ["test"],
    bricklink: ["test"],
  },
  color: {
    internalId: "color:test",
    nameDe: "Testfarbe",
    nameEn: "Test color",
    displayHex: "#123ABC",
    ldrawCode: 1,
    rebrickableId: 2,
    bricklinkId: 3,
    evidenceIds: ["evidence:color:test"],
  },
  assetId: "asset:head:test",
  attachmentProfileId: "attachment:head:test",
  allowedSlots: ["head"],
  procurement: {
    strategy: "single-item",
    status: "verified",
    lines: [
      {
        itemType: "P",
        bricklinkItemId: "test",
        bricklinkColorId: 3,
        quantity: 1,
        evidenceIds: ["evidence:purchase:test"],
      },
    ],
  },
  searchableTags: ["fixture"],
  catalogEvidenceIds: ["evidence:catalog:test"],
  releaseStatus: "published",
} as const;

describe("catalog contracts", () => {
  it("accepts a fully evidenced published variant", () => {
    expect(partVariantSchema.parse(validPublishedVariant)).toEqual(validPublishedVariant);
  });

  it("rejects published variants without verified procurement", () => {
    const candidate = {
      ...validPublishedVariant,
      procurement: { strategy: "single-item", status: "unverified", lines: [] },
    };

    expect(() => partVariantSchema.parse(candidate)).toThrowError(
      /Published variants require a verified procurement recipe/u,
    );
  });

  it("rejects verified procurement recipes without purchase lines", () => {
    expect(() =>
      procurementRecipeSchema.parse({
        strategy: "single-item",
        status: "verified",
        lines: [],
      }),
    ).toThrowError(/needs at least one purchase line/u);
  });

  it("rejects unknown slots in saved figure documents", () => {
    expect(() =>
      figureDocumentSchema.parse({
        schemaVersion: 1,
        catalogVersion: "fixture-v1",
        id: "figure:test",
        name: "Testfigur",
        updatedAt: "2026-09-27T12:00:00.000Z",
        selections: { unsupportedSlot: { variantId: "variant:test" } },
        cameraPreset: "front",
      }),
    ).toThrowError();
  });
});
