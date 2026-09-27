import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { describe, expect, it } from "vitest";
import assortment from "../../data/curated/ff03-test-assortment.json" with { type: "json" };
import mappings from "../../data/curated/ldraw-catalog-mappings.json" with { type: "json" };
import thumbnailIndex from "../../data/generated/ldraw-catalog-thumbnails.json" with { type: "json" };

const ROOT = "public/assets/ldraw/catalog";
const sha256 = (content: string): string => createHash("sha256").update(content).digest("hex");

describe("official LDraw catalog thumbnails", () => {
  it("accounts for every FF-03 component without guessing unresolved mappings", () => {
    expect(mappings.entries).toHaveLength(assortment.components.length);
    expect(new Set(mappings.entries.map(({ componentId }) => componentId))).toEqual(
      new Set(assortment.components.map(({ id }) => id)),
    );
    expect(mappings.entries.filter(({ status }) => status === "verified")).toHaveLength(10);
    expect(mappings.entries.filter(({ status }) => status === "blocked")).toHaveLength(7);
    expect(mappings.prototypeOnly).toBe(true);
    expect(mappings.publishable).toBe(false);
  });

  it("backs every verified mapping with an official licensed LDraw file", async () => {
    for (const entry of mappings.entries) {
      if (entry.status !== "verified") {
        expect(entry).toHaveProperty("reason");
        continue;
      }

      expect(entry.packageUrl).toMatch(/^https:\/\/library\.ldraw\.org\/library\/official\/parts\//u);
      expect(entry.packageSha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(entry.fileSha256).toMatch(/^[a-f0-9]{64}$/u);
      if (!entry.ldrawFile || !entry.mappingEvidence) {
        throw new Error(`Verified mapping is incomplete: ${entry.componentId}`);
      }
      const content = await readFile(`${ROOT}/${entry.ldrawFile}`, "utf8");
      expect(content).toContain("0 !LDRAW_ORG Part UPDATE");
      expect(content).toContain("0 !LICENSE Licensed under CC BY");
      expect(sha256(content)).toBe(entry.fileSha256);

      if (entry.mappingEvidence.startsWith("Exact")) {
        expect(basename(entry.ldrawFile, ".dat")).toBe(entry.rebrickablePartNum);
      } else {
        expect(content).toContain(`Rebrickable ${entry.rebrickablePartNum}`);
      }
    }
  });

  it("generates real local previews only for verified entries", async () => {
    expect(thumbnailIndex.summary).toEqual({ componentCount: 17, verifiedCount: 10, blockedCount: 7 });
    expect(thumbnailIndex.publishable).toBe(false);

    for (const entry of thumbnailIndex.entries) {
      if (entry.status === "blocked") {
        expect(entry.thumbnailUrl).toBeNull();
        expect(entry.modelUrl).toBeNull();
        continue;
      }

      const thumbnail = await readFile(`public${entry.thumbnailUrl}`, "utf8");
      const model = await readFile(`public${entry.modelUrl}`, "utf8");
      expect(thumbnail).toContain("OFFIZIELLES LDRAW");
      expect(thumbnail).toContain("<polygon");
      expect(thumbnail).not.toContain("SYNTHETIC");
      expect(sha256(thumbnail)).toBe(entry.thumbnailSha256);
      expect(sha256(model)).toBe(entry.modelSha256);
      expect(model).not.toMatch(/^1 .*https?:\/\//mu);
    }
  });
});
