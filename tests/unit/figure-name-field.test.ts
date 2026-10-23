import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { messages } from "../../src/i18n.js";

describe("figure name and part-number search hint", () => {
  it("lets the builder panel rename the figure and keeps an emptied name out of the draft", async () => {
    const panel = await readFile("src/components/FigurePartsPanel.tsx", "utf8");
    expect(panel).toContain('label={t("figure.nameLabel")}');
    expect(panel).toContain("maxLength={80}");
    expect(panel).toContain("if (next.trim().length > 0) onFigureNameChange(next);");
    const workspace = await readFile("src/components/CatalogWorkspace.tsx", "utf8");
    expect(workspace).toContain("onFigureNameChange={setFigureName}");
  });

  it("names the figure field and the part-number search in both languages", () => {
    for (const language of ["de", "en"] as const) {
      expect(messages[language]["figure.nameLabel"]?.length ?? 0).toBeGreaterThan(5);
    }
    expect(messages.de["catalog.searchLabel"]).toContain("Teilenummer");
    expect(messages.en["catalog.searchLabel"]).toContain("part number");
  });
});
