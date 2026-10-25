import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { messages } from "../../src/i18n.js";

describe("renaming a saved figure", () => {
  it("changes only the name of the stored entry", async () => {
    const store = await readFile("src/storage/figure-draft-store.ts", "utf8");
    const rename = /export const renameSavedFigure[\s\S]*?\n\};\n/u.exec(store)?.[0] ?? "";
    expect(rename).toContain("figureDocumentSchema.parse({ ...previous.document, name })");
    expect(rename).toContain("...previous,");
    // The save date and the preview stay, so the figure keeps its position and no copy appears.
    expect(rename).not.toContain("updatedAt");
    expect(rename).not.toContain("collectionId()");
    expect(rename).toContain(".put(renamed)");
  });

  it("offers the dialog on every card and refuses an empty or unchanged name", async () => {
    const card = await readFile("src/components/CollectionFigureCard.tsx", "utf8");
    expect(card).toContain("onClick={onRename}");
    const page = await readFile("src/components/CollectionPage.tsx", "utf8");
    expect(page).toContain("name === target.document.name");
    const dialog = await readFile("src/components/FigureRenameDialog.tsx", "utf8");
    expect(dialog).toContain("maxLength={80}");
    expect(dialog).toContain("if (normalizedName) onSubmit(normalizedName);");
  });

  it("has the texts in both languages", () => {
    for (const language of ["de", "en"] as const) {
      for (const key of [
        "collection.renameFigure",
        "collection.figureDialog.eyebrow",
        "collection.figureDialog.title",
        "collection.figureDialog.description",
      ] as const) {
        expect(messages[language][key]?.length ?? 0, `${language} ${key}`).toBeGreaterThan(3);
      }
    }
  });
});
