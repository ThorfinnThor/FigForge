import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { figureDocumentSchema } from "../../src/contracts/figure-document.js";
import { FIGURE_TEMPLATES, figureTemplateForId } from "../../src/ideas/figure-templates.js";

const runtimeFiles = ["head", "headwear", "torso-assembly", "legs-assembly", "hand-accessory"] as const;

describe("curated figure templates", () => {
  it("contains unique, schema-valid, complete templates", () => {
    expect(new Set(FIGURE_TEMPLATES.map(({ id }) => id)).size).toBe(FIGURE_TEMPLATES.length);
    expect(FIGURE_TEMPLATES).toHaveLength(4);
    for (const template of FIGURE_TEMPLATES) {
      expect(figureDocumentSchema.parse(template.document)).toEqual(template.document);
      expect(template.document.selections).toHaveLength(5);
      expect(template.thumbnails).toHaveLength(5);
      expect(figureTemplateForId(template.id)).toBe(template);
    }
    expect(figureTemplateForId("not-a-template")).toBeUndefined();
  });

  it("uses only components from the generated digital LDraw runtime", async () => {
    const components = new Map<string, unknown>();
    for (const file of runtimeFiles) {
      const runtime = JSON.parse(await readFile(`data/generated/ldraw-runtime/${file}.json`, "utf8")) as {
        entries: Array<{ componentId: string; geometryFallback: unknown }>;
      };
      for (const entry of runtime.entries) components.set(entry.componentId, entry.geometryFallback);
    }

    for (const template of FIGURE_TEMPLATES) {
      for (const selection of template.document.selections) {
        expect(components.has(selection.componentId), `${template.id}: ${selection.componentId}`).toBe(true);
        expect(components.get(selection.componentId), `${template.id}: ${selection.componentId} must use exact geometry`).toBeNull();
      }
    }
  });

  it("exposes a public ideas route and consumes one-time template imports", async () => {
    const appSource = await readFile("src/app/App.tsx", "utf8");
    const workspaceSource = await readFile("src/components/CatalogWorkspace.tsx", "utf8");
    const importLocationSource = await readFile("src/figure/import-location.ts", "utf8");

    expect(appSource).toContain('pathname === "/ideas"');
    expect(workspaceSource).toContain("figureTemplateForId");
    expect(workspaceSource).toContain('get("template")');
    expect(importLocationSource).toContain('searchParams.delete("template")');
  });
});
