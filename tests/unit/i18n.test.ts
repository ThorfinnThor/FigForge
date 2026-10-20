import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("language selection", () => {
  it("contains German and English UI messages and lets the URL decide the language", async () => {
    const source = await readFile("src/i18n.tsx", "utf8");

    expect(source).toContain("languageFromPath(window.location.pathname)");
    expect(source).toContain("switchLanguageUrl(window.location, next)");
    expect(source).not.toContain("window.localStorage");
    expect(source).toContain('"catalog.mode.exact": "Mit Aufdruck in der Vorschau"');
    expect(source).toContain('"catalog.mode.exact": "With print shown in preview"');
    expect(source).toContain('"language.en": "English"');
    expect(source).toContain('"language.de": "Deutsch"');
    expect(source).toContain('"collection.title": "Deine Sammlung"');
    expect(source).toContain('"collection.stageEyebrow": "Bühne"');
    expect(source).not.toContain('"figure.collection.dialogEyebrow": "Lokale Collection"');
  });
});
