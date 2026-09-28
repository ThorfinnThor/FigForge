import { describe, expect, it } from "vitest";
import type { NormalizedCatalog } from "../../src/contracts/catalog-refresh.js";
import { buildCatalogPackages } from "../../tools/catalog/build-catalog-packages.js";

const fixtureCatalog: NormalizedCatalog = {
  schemaVersion: 1,
  sourcePolicy: "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.",
  sourceLockSha256: "a".repeat(64),
  sourceLockUpdatedAt: "2026-09-28",
  artifacts: [
    { fileName: "parts.csv.gz", sha256: "b".repeat(64), rowCount: 3, columns: ["part_num"] },
    { fileName: "part_categories.csv.gz", sha256: "c".repeat(64), rowCount: 3, columns: ["id"] },
    { fileName: "colors.csv.gz", sha256: "d".repeat(64), rowCount: 1, columns: ["id"] },
  ],
  parts: [
    {
      id: "part:head",
      partNum: "3626c",
      name: "Minifig Head",
      categoryId: 59,
      categoryName: "Minifig Heads",
      material: "Plastic",
      colorVariants: [
        { elementId: "1", colorId: 14, colorName: "Yellow", rgb: "F2CD37", evidenceId: "evidence:yellow" },
        { elementId: "2", colorId: 14, colorName: "Yellow", rgb: "F2CD37", evidenceId: "evidence:yellow-2" },
      ],
      relationshipCount: 0,
      evidenceIds: ["evidence:head"],
    },
    {
      id: "part:hat",
      partNum: "3901",
      name: "Minifig Hair",
      categoryId: 65,
      categoryName: "Minifig Headwear",
      material: "Plastic",
      colorVariants: [],
      relationshipCount: 0,
      evidenceIds: ["evidence:hat"],
    },
    {
      id: "part:brick",
      partNum: "3001",
      name: "Brick 2 x 4",
      categoryId: 11,
      categoryName: "Bricks",
      material: "Plastic",
      colorVariants: [],
      relationshipCount: 0,
      evidenceIds: ["evidence:brick"],
    },
  ],
};

describe("browser catalog packages", () => {
  it("packages only the explicitly supported Minifig slot categories", () => {
    const result = buildCatalogPackages(fixtureCatalog);

    expect(result.manifest.includedPartCount).toBe(2);
    expect(result.packages.head.parts[0]).toMatchObject({
      rebrickablePartNum: "3626c",
      role: "head",
      colorNames: ["Yellow"],
    });
    expect(result.packages.headwear.parts[0]?.rebrickablePartNum).toBe("3901");
    expect(Object.values(result.packages).flatMap(({ parts }) => parts))
      .not.toContainEqual(expect.objectContaining({ rebrickablePartNum: "3001" }));
  });

  it("keeps every package locked to the normalized Rebrickable source revision", () => {
    const result = buildCatalogPackages(fixtureCatalog);

    expect(result.manifest.sourceLockSha256).toBe(fixtureCatalog.sourceLockSha256);
    expect(Object.values(result.packages).every(
      (catalogPackage) => catalogPackage.sourceLockSha256 === fixtureCatalog.sourceLockSha256,
    )).toBe(true);
  });
});
