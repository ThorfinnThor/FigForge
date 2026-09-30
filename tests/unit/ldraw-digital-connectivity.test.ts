import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import registryJson from "../../data/generated/ldraw-digital-connectivity.json" with { type: "json" };
import { ldrawDigitalConnectivitySchema } from "../../src/contracts/ldraw-digital-connectivity.js";

const registry = ldrawDigitalConnectivitySchema.parse(registryJson);
const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

describe("LDraw/LDCad digital connectivity", () => {
  it("supports eight standard-minifigure components without human input", () => {
    expect(registry.summary).toEqual({
      entryCount: 10,
      digitallySupportedCount: 8,
      blockedCount: 2,
      humanInputRequired: false,
    });
    expect(registry.entries.filter(({ status }) => status === "digitally-supported")).toHaveLength(8);
  });

  it("keeps the missing sword metadata and incomplete torso assembly blocked", () => {
    expect(registry.entries.find(({ componentId }) => componentId === "ff03-hand-11439")).toMatchObject({
      status: "blocked",
      reasonCode: "missing-snap-metadata",
    });
    expect(registry.entries.find(({ componentId }) => componentId === "ff03-torso-3814")).toMatchObject({
      status: "blocked",
      reasonCode: "incomplete-sales-assembly",
    });
  });

  it("binds all vendored source files to their exact hashes and license headers", async () => {
    expect(registry.sourceFiles).toHaveLength(41);
    for (const sourceFile of registry.sourceFiles) {
      const content = await readFile(sourceFile.path, "utf8");
      expect(sha256(content)).toBe(sourceFile.sha256);
      expect(content).toContain("!LICENSE CC BY-SA 4.0");
    }
  });

  it("provides a finite 4x4 placement matrix for each supported component", () => {
    for (const entry of registry.entries) {
      if (entry.status === "digitally-supported") {
        expect(entry.placementTransformLdu).toHaveLength(16);
        expect(entry.placementTransformLdu.every(Number.isFinite)).toBe(true);
      }
    }
  });

  it("provides a versioned identity placement for complete torso shortcuts", () => {
    expect(registry.familyProfiles).toContainEqual(expect.objectContaining({
      profileId: "standard-minifig-torso-assembly-v1",
      role: "torsoAssembly",
      placementMode: "prototype-family-origin",
      eligibility: "official-shortcut-standard-torso-arms-hands",
      placementTransformLdu: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    }));
  });

  it("provides the reference lower-body placement for complete hips-and-legs files", () => {
    expect(registry.familyProfiles).toContainEqual(expect.objectContaining({
      profileId: "complete-minifig-legs-assembly-v1",
      role: "legsAssembly",
      placementMode: "prototype-family-origin",
      eligibility: "official-complete-minifig-hips-legs-title",
      placementTransformLdu: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 32, 0, 1],
    }));
  });
});
