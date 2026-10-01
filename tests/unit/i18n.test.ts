import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("language selection", () => {
  it("contains German and English UI messages and persists the selected language", async () => {
    const source = await readFile("src/i18n.tsx", "utf8");

    expect(source).toContain('useState<Language>("de")');
    expect(source).toContain('LANGUAGE_STORAGE_KEY = "figforge-language"');
    expect(source).toContain('"catalog.mode.exact": "Exakte Druckgeometrie"');
    expect(source).toContain('"catalog.mode.exact": "Exact printed geometry"');
    expect(source).toContain('"language.en": "English"');
    expect(source).toContain('"language.de": "Deutsch"');
  });
});
