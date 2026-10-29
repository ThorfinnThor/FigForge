import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { messages } from "../../src/i18n.js";

describe("fixes from the user test of 2026-10-29", () => {
  it("shows readable part titles in the figure panel and keeps the catalog name as a tooltip", async () => {
    const panel = await readFile("src/components/FigurePartsPanel.tsx", "utf8");
    expect(panel).toContain("partDisplay(slot.component.name).title");
    expect(panel).toContain("title={slot.component ? slot.component.name : undefined}");
  });

  it("offers a touch hint next to the mouse hint and hides the wrong one by pointer type", async () => {
    for (const language of ["de", "en"] as const) {
      expect(messages[language]["viewport.helpTouch"]?.length ?? 0).toBeGreaterThan(10);
      expect(messages[language]["viewport.helpTouch"]).not.toMatch(/Mausrad|mouse wheel|Trackpad/u);
    }
    const css = await readFile("src/styles/base.css", "utf8");
    expect(css).toMatch(/@media \(pointer: coarse\) \{\s+\.viewport-help__pointer \{\s+display: none;/u);
  });

  it("puts the chosen theme's figures before the other worlds only on theme pages", async () => {
    const page = await readFile("src/components/IdeasPage.tsx", "utf8");
    expect(page).toContain("{selectedTheme ? figuresSection : worldsSection}");
    expect(page).toContain("{selectedTheme ? worldsSection : figuresSection}");
  });
});
