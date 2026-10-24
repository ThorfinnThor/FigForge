import { describe, expect, it } from "vitest";
import { PLAYGROUND_LAYOUT_MAX_FIGURES } from "../../src/contracts/playground-layout.js";
import { GUIDE_SECTIONS, type GuideId } from "../../src/guides/guide-content.js";
import { GUIDE_PRODUCTS } from "../../src/guides/guide-products.js";
import { messages } from "../../src/i18n.js";
import { WORLDS } from "../../src/seo/page-bodies.js";
import { normalizeSearchQuery } from "../../src/search/normalize-query.js";

const PARENT_GUIDES = ["kids-gift", "build-with-kids", "christmas"] as const satisfies readonly GuideId[];
const textOf = (id: GuideId, language: "de" | "en"): string => GUIDE_SECTIONS[id][language]
  .flatMap((section) => [section.heading, ...(section.paragraphs ?? []), ...(section.items ?? []), ...(section.closing ?? [])])
  .join("\n");

describe("guides for parents", () => {
  it("keep the safety rule of the gift guide in every language", () => {
    for (const id of PARENT_GUIDES) {
      expect(textOf(id, "de"), id).toContain("Sie sind nichts für Kinder unter drei Jahren.");
      expect(textOf(id, "en"), id).toContain("They are not for children under three.");
    }
  });

  it("do not state prices, delivery times or availability", () => {
    for (const id of PARENT_GUIDES) {
      for (const language of ["de", "en"] as const) {
        expect(textOf(id, language), `${id} ${language}`).not.toMatch(/€|\$|\bEUR\b|\d+\s*(Euro|Tage|Wochen|days|weeks)\b/iu);
      }
    }
  });

  it("quote the number of theme worlds and the stage limit from the data", () => {
    expect(WORLDS).toHaveLength(12);
    expect(textOf("kids-gift", "de")).toContain("zwölf Themenwelten");
    expect(textOf("kids-gift", "en")).toContain("twelve theme worlds");
    // The Christmas guide names four worlds and "eight more".
    expect(textOf("christmas", "de")).toContain("Feuerwehr und acht weitere Themenwelten");
    expect(textOf("christmas", "en")).toContain("eight more theme worlds");
    expect(PLAYGROUND_LAYOUT_MAX_FIGURES).toBe(6);
    for (const id of ["kids-gift", "build-with-kids", "christmas"] as const) {
      expect(textOf(id, "de").toLowerCase(), id).toContain("bis zu sechs figuren");
      expect(textOf(id, "en").toLowerCase(), id).toContain("up to six figures");
    }
  });

  it("name the buttons and tabs exactly as the interface does", () => {
    const steps = (language: "de" | "en") => textOf("build-with-kids", language);
    for (const language of ["de", "en"] as const) {
      const ui = messages[language];
      for (const key of ["figure.collection.save", "figure.buyParts"] as const) {
        expect(steps(language), `${language} ${key}`).toContain(`“${ui[key]}”`.replace(/^“/u, language === "de" ? "„" : "“").replace(/”$/u, language === "de" ? "“" : "”"));
      }
      for (const key of ["category.head", "category.headwear", "category.torsoAssembly", "category.legsAssembly", "category.handAccessory"] as const) {
        expect(steps(language), `${language} ${key}`).toContain(ui[key]);
      }
      for (const key of ["viewport.camera.three-quarter", "viewport.camera.front", "viewport.camera.back"] as const) {
        expect(steps(language), `${language} ${key}`).toContain(ui[key]);
      }
      expect(steps(language)).toContain(ui["figure.title"]);
    }
  });

  it("only promise German search words that the lexicon translates", () => {
    const english = (word: string) => normalizeSearchQuery(word).englishText;
    for (const word of ["Pirat", "Ritter", "Roboter", "Wikinger", "Hexe"]) {
      expect(textOf("build-with-kids", "de")).toContain(`„${word}“`);
      expect(english(word), word).not.toBe(word.toLowerCase());
    }
    expect(english("rote Haare")).toContain("red");
  });

  it("refer to other guides by names that start their titles", () => {
    const references: Record<"de" | "en", ReadonlyArray<[GuideId, GuideId, string]>> = {
      de: [
        ["kids-gift", "profession", "Minifigur nach Beruf oder Hobby"],
        ["kids-gift", "order", "Minifiguren-Teile bestellen"],
        ["build-with-kids", "order", "Minifiguren-Teile bestellen"],
        ["christmas", "profession", "Minifigur nach Beruf oder Hobby"],
        ["christmas", "kids-gift", "Minifigur als Geschenk für Kinder"],
      ],
      en: [
        ["kids-gift", "profession", "Minifigure by profession or hobby"],
        ["kids-gift", "order", "Order minifigure parts"],
        ["build-with-kids", "order", "Order minifigure parts"],
        ["christmas", "profession", "Minifigure by profession or hobby"],
        ["christmas", "kids-gift", "Minifigure gift for kids"],
      ],
    };
    for (const language of ["de", "en"] as const) {
      for (const [from, target, name] of references[language]) {
        expect(textOf(from, language), `${language} ${from}`).toContain(`“${name}”`.replace(/^“/u, language === "de" ? "„" : "“").replace(/”$/u, language === "de" ? "“" : "”"));
        const titles = [messages[language][`guide.${target}.title`], messages[language][`guide.${target}.metaTitle`]];
        expect(titles.some((title) => title?.startsWith(name)), `${language} ${target}: ${name}`).toBe(true);
      }
    }
  });

  it("show products only where they fit and none of them are missing", () => {
    expect(GUIDE_PRODUCTS["build-with-kids"]).toBeUndefined();
    expect(GUIDE_PRODUCTS["kids-gift"]?.length).toBeGreaterThan(0);
    expect(GUIDE_PRODUCTS.christmas?.length).toBeGreaterThan(0);
  });
});
