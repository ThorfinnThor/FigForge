import { describe, expect, it } from "vitest";
import sourceLockFixture from "../../data/sources.lock.json" with { type: "json" };
import { sourceLockSchema, type SourceLock } from "../../src/contracts/source-lock.js";
import { normalizeCatalogArtifacts, type CatalogArtifactBytes } from "../../tools/catalog/normalize-catalog.js";
import { parseCsv } from "../../src/catalog/csv.js";

const fixtureCsv = {
  "colors.csv.gz": "id,name,rgb,is_trans\n-1,Unknown,0033B2,f\n1,Black,05131D,f\n14,Yellow,F2CD37,f\n",
  "part_categories.csv.gz": "id,name\n59,Minifig Heads\n73,Minifig Shields\n",
  "parts.csv.gz": "part_num,name,part_cat_id,part_material\n3001,Head Plain,59,Plastic\n3002,\"Shield, Round\",73,Plastic\n",
  "part_relationships.csv.gz": "rel_type,child_part_num,parent_part_num\nsubpart,3002,3001\n",
  "elements.csv.gz": "element_id,part_num,color_id\n9001,3001,14\n9002,3002,1\n9003,3002,-1\n",
} as const;

const fixtureArtifacts: CatalogArtifactBytes[] = Object.entries(fixtureCsv).map(([fileName, content]) => ({
  fileName: fileName as CatalogArtifactBytes["fileName"],
  bytes: new TextEncoder().encode(content),
}));

const fixtureLock = (): SourceLock => {
  const parsed = sourceLockSchema.parse(sourceLockFixture);
  return {
    ...parsed,
    sources: [{
      ...parsed.sources[0],
      artifacts: parsed.sources[0].artifacts.map((artifact) => ({
        ...artifact,
        downloadUrl: null,
        sha256: null,
        retrievedAt: null,
      })),
    }],
  };
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

    expect(result.changedArtifacts).toHaveLength(5);
    expect(result.normalizedCatalog.parts.map(({ partNum }) => partNum)).toEqual(["3001", "3002"]);
    expect(result.normalizedCatalog.parts[0]?.colorVariants[0]).toMatchObject({
      elementId: "9001",
      colorName: "Yellow",
      rgb: "F2CD37",
    });
    expect(result.normalizedCatalog.parts[0]?.relationshipCount).toBe(1);
    expect(result.normalizedCatalog.parts[1]?.relationshipCount).toBe(0);
    expect(result.normalizedCatalog.parts[1]?.colorVariants[1]).toMatchObject({
      elementId: "9003",
      colorId: -1,
      colorName: "Unknown",
      rgb: "0033B2",
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
