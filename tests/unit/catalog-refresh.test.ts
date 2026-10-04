import { describe, expect, it } from "vitest";
import sourceLockFixture from "../../data/sources.lock.json" with { type: "json" };
import { sourceLockSchema, type SourceLock } from "../../src/contracts/source-lock.js";
import { normalizeCatalogArtifacts, type CatalogArtifactBytes } from "../../tools/catalog/normalize-catalog.js";
import { parseCsv } from "../../src/catalog/csv.js";

const fixtureCsv = {
  "colors.csv.gz": "id,name,rgb,is_trans\n-1,Unknown,0033B2,f\n1,Black,05131D,f\n14,Yellow,F2CD37,f\n",
  "part_categories.csv.gz": "id,name\n59,Minifig Heads\n73,Minifig Shields\n",
  "parts.csv.gz": "part_num,name,part_cat_id,part_material\n3001,Head Plain,59,Plastic\n3002,\"Shield, Round\",73,Plastic\n",
  "part_relationships.csv.gz": "rel_type,child_part_num,parent_part_num\nP,3002,3001\n",
  "elements.csv.gz": "element_id,part_num,color_id\n9001,3001,14\n9002,3002,1\n9003,3002,-1\n",
  "sets.csv.gz": "set_num,name,year,theme_id,num_parts,img_url\nTEST-1,Test Figure Set,2026,1,2,https://example.invalid/ignored.jpg\n",
  "inventories.csv.gz": "id,version,set_num\n10,1,TEST-1\n11,1,fig-test\n",
  "inventory_parts.csv.gz": "inventory_id,part_num,color_id,quantity,is_spare,img_url\n10,3002,1,1,False,\n11,3001,14,1,False,\n11,9999,1,1,False,\n",
  "inventory_minifigs.csv.gz": "inventory_id,fig_num,quantity\n10,fig-test,1\n",
  "minifigs.csv.gz": "fig_num,name,num_parts,img_url\nfig-test,Test Figure,1,\n",
} as const;

const fixtureArtifacts: CatalogArtifactBytes[] = Object.entries(fixtureCsv).map(([fileName, content]) => ({
  fileName: fileName as CatalogArtifactBytes["fileName"],
  bytes: new TextEncoder().encode(content),
}));

const fixtureLock = (): SourceLock => {
  const parsed = sourceLockSchema.parse(sourceLockFixture);
  const coreArtifacts = parsed.sources[0].artifacts.map((artifact) => ({
    ...artifact,
    downloadUrl: null,
    sha256: null,
    retrievedAt: null,
  }));
  const coreNames = new Set(coreArtifacts.map(({ fileName }) => fileName));
  return sourceLockSchema.parse({
    ...parsed,
    sources: [{
      ...parsed.sources[0],
      artifacts: [
        ...coreArtifacts,
        ...Object.keys(fixtureCsv)
          .filter((fileName) => !coreNames.has(fileName as CatalogArtifactBytes["fileName"]))
          .map((fileName) => ({
            fileName,
            required: true,
            downloadUrl: null,
            sha256: null,
            retrievedAt: null,
          })),
      ],
    }],
  });
};

describe("catalog refresh adapter", () => {
  it("parses quoted CSV fields and normalizes catalog rows deterministically", () => {
    expect(parseCsv(fixtureCsv["parts.csv.gz"], "parts.csv.gz").rows[1]?.name).toBe("Shield, Round");
    const result = normalizeCatalogArtifacts({
      sourceLock: fixtureLock(),
      artifacts: fixtureArtifacts,
      allowHashUpdates: true,
      retrievedAt: "2026-09-27T10:00:00.000Z",
    });

    expect(result.changedArtifacts).toHaveLength(10);
    expect(result.normalizedCatalog.parts.map(({ partNum }) => partNum)).toEqual(["3001", "3002"]);
    expect(result.normalizedCatalog.parts[0]?.colorVariants[0]).toMatchObject({
      elementId: "9001",
      colorName: "Yellow",
      rgb: "F2CD37",
    });
    expect(result.normalizedCatalog.parts[0]?.catalogColors).toEqual([
      expect.objectContaining({ colorId: 14, colorName: "Yellow" }),
    ]);
    expect(result.normalizedCatalog.parts[1]?.catalogColors).toEqual([
      expect.objectContaining({ colorId: 1, colorName: "Black" }),
    ]);
    expect(result.normalizedCatalog.parts[0]?.relationshipCount).toBe(1);
    expect(result.normalizedCatalog.parts[1]?.relationshipCount).toBe(0);
    expect(result.normalizedCatalog.parts[1]?.printParentPartNums).toEqual(["3001"]);
    expect(result.normalizedCatalog.parts[1]?.colorVariants[1]).toMatchObject({
      elementId: "9003",
      colorId: -1,
      colorName: "Unknown",
      rgb: "0033B2",
    });
    expect(result.catalogSetIndex).toMatchObject({
      parts: ["3001", "3002"],
      sets: [{ setNum: "TEST-1", name: "Test Figure Set", year: 2026, partIndexes: [0, 1] }],
      summary: {
        relevantPartCount: 2,
        mappedPartCount: 2,
        unmappedPartCount: 0,
        setCount: 1,
        associationCount: 2,
      },
    });
  });

  it("rejects a changed hash when lock updates are not explicitly allowed", () => {
    expect(() =>
      normalizeCatalogArtifacts({
        sourceLock: fixtureLock(),
        artifacts: fixtureArtifacts,
        allowHashUpdates: false,
        retrievedAt: "2026-09-27T10:00:00.000Z",
      }),
    ).toThrowError(/SHA-256 mismatch/u);
  });

  it("rejects MOC content before normalization", () => {
    const artifacts = fixtureArtifacts.map((artifact) =>
      artifact.fileName === "parts.csv.gz"
        ? { ...artifact, bytes: new TextEncoder().encode(fixtureCsv["parts.csv.gz"].replace("Head Plain", "MOC custom model")) }
        : artifact,
    );

    expect(() =>
      normalizeCatalogArtifacts({
        sourceLock: fixtureLock(),
        artifacts,
        allowHashUpdates: true,
        retrievedAt: "2026-09-27T10:00:00.000Z",
      }),
    ).toThrowError(/Forbidden MOC content/u);
  });

  it("rejects missing required catalog files", () => {
    expect(() =>
      normalizeCatalogArtifacts({
        sourceLock: fixtureLock(),
        artifacts: fixtureArtifacts.filter(({ fileName }) => fileName !== "parts.csv.gz"),
        allowHashUpdates: true,
        retrievedAt: "2026-09-27T10:00:00.000Z",
      }),
    ).toThrowError(/Required catalog artifact is missing: parts.csv.gz/u);
  });
});
