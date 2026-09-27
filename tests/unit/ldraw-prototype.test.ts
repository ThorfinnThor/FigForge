import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const ROOT = "public/assets/ldraw/prototype";

type PrototypeManifest = {
  prototypeOnly: boolean;
  publishable: boolean;
  model: string;
  assemblySource: string;
  materials: string;
  parts: Array<{
    file: string;
    ldrawStatus: string;
    packageSha256: string;
    packageUrl: string;
  }>;
  notes: string[];
};

describe("local official LDraw prototype", () => {
  it("assembles the four explicitly reviewed prototype parts", async () => {
    const model = await readFile(`${ROOT}/models/figforge-minifigure.ldr`, "utf8");

    expect(model).toContain("1 4 0 0 0 1 0 0 0 1 0 0 0 1 973c01.dat");
    expect(model).toContain("1 14 0 -24 0 1 0 0 0 1 0 0 0 1 3626cpcbe.dat");
    expect(model).toContain("1 70 0 -24 0 1 0 0 0 1 0 0 0 1 25409.dat");
    expect(model).toContain("1 72 0 32 0 1 0 0 0 1 0 0 0 1 73200b-f1.dat");
    expect(model).not.toMatch(/https?:\/\//u);
  });

  it("retains LDraw attribution headers and a non-publishable evidence manifest", async () => {
    const manifest = JSON.parse(
      await readFile(`${ROOT}/prototype-manifest.json`, "utf8"),
    ) as PrototypeManifest;

    expect(manifest.prototypeOnly).toBe(true);
    expect(manifest.publishable).toBe(false);
    expect(manifest.model).toBe("/assets/ldraw/prototype/models/figforge-minifigure-packed.mpd");
    expect(manifest.assemblySource).toBe("/assets/ldraw/prototype/models/figforge-minifigure.ldr");
    expect(manifest.materials).toBe("/assets/ldraw/prototype/LDConfig.ldr");
    expect(manifest.parts).toHaveLength(4);
    expect(manifest.notes.join(" ")).toContain("No Rebrickable API or MOC files");

    for (const part of manifest.parts) {
      expect(part.ldrawStatus).toBe("official");
      expect(part.packageUrl).toMatch(/^https:\/\/library\.ldraw\.org\//u);
      expect(part.packageSha256).toMatch(/^[a-f0-9]{64}$/u);
      const content = await readFile(`${ROOT}/${part.file}`, "utf8");
      expect(content).toContain("0 !LICENSE Licensed under CC BY 4.0");
      expect(createHash("sha256").update(content).digest("hex")).toMatch(/^[a-f0-9]{64}$/u);
    }
  });

  it("ships the complete local dependency graph as one browser-loadable MPD", async () => {
    const packedModel = await readFile(
      `${ROOT}/models/figforge-minifigure-packed.mpd`,
      "utf8",
    );
    const embeddedFiles = packedModel.match(/^0 FILE /gmu) ?? [];

    expect(embeddedFiles).toHaveLength(80);
    expect(packedModel).toContain("0 FILE 973c01.dat");
    expect(packedModel).toContain("0 FILE 3626cpcbe.dat");
    expect(packedModel).toContain("0 FILE 25409.dat");
    expect(packedModel).toContain("0 FILE 73200b-f1.dat");
    const subfileReferences = packedModel
      .split(/\r?\n/u)
      .filter((line) => line.startsWith("1 "));
    expect(subfileReferences.join("\n")).not.toMatch(/https?:\/\//u);
  });
});
