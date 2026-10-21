import { describe, expect, it } from "vitest";
import { messages } from "../../src/i18n.js";
import { splitInline } from "../../src/privacy/inline.js";
import { PRIVACY_SECTIONS } from "../../src/privacy/privacy-content.js";
import { renderRoutePage } from "../../src/seo/render.js";
import { SEO_ROUTES } from "../../src/seo/routes.js";

const TEMPLATE = '<html lang="de"><head><meta name="description" content="x" /><title>x</title></head><body><div id="root"></div></body></html>';
const allText = (language: "de" | "en"): string => PRIVACY_SECTIONS[language]
  .flatMap((section) => [section.heading, ...(section.paragraphs ?? []), ...(section.items ?? []), ...(section.closing ?? [])])
  .join("\n");

describe("privacy notice", () => {
  it("has the same sections in the same order in both languages", () => {
    expect(PRIVACY_SECTIONS.en.map(({ id }) => id)).toEqual(PRIVACY_SECTIONS.de.map(({ id }) => id));
    expect(PRIVACY_SECTIONS.de.map(({ id }) => id)).toEqual([
      "controller", "summary", "hosting", "cookies", "local", "email", "external", "rights", "complaint", "automated", "changes",
    ]);
  });

  it("states what the site really does: no cookies, own domain only, local storage, Cloudflare, Purelymail", () => {
    for (const language of ["de", "en"] as const) {
      const text = allText(language);
      for (const needle of ["Cloudflare", "Purelymail", "IndexedDB", "Art. 6", "Art. 15", "datenschutz-berlin.de", "contact@createyourminifig.com"]) {
        expect(text, `${language} ${needle}`).toContain(needle);
      }
      expect(text).not.toContain("info@createyourminifig.com");
    }
    expect(allText("de")).toContain("setzt derzeit keine Cookies");
    expect(allText("en")).toContain("currently sets no cookies");
  });

  it("promises consent and an updated notice before any cookie-setting service such as Google goes live", () => {
    const cookies = (language: "de" | "en") => PRIVACY_SECTIONS[language].find(({ id }) => id === "cookies")!.paragraphs!.join(" ");
    expect(cookies("de")).toContain("Google");
    expect(cookies("de")).toContain("Einwilligung");
    expect(cookies("en")).toContain("Google");
    expect(cookies("en")).toContain("consent");
  });

  it("keeps the Amazon disclosure sentence and never claims a signed processing agreement", () => {
    expect(allText("de")).toContain(messages.de["amazon.disclosure"]!);
    expect(allText("en")).toContain(messages.en["amazon.disclosure"]!);
    expect(allText("de")).not.toMatch(/besteht ein Vertrag zur Auftragsverarbeitung/u);
  });

  it("splits inline links and keeps internal and external hrefs apart", () => {
    expect(splitInline("Siehe [Impressum](/impressum) und [Cloudflare](https://www.cloudflare.com/privacypolicy/).")).toEqual([
      { text: "Siehe " },
      { text: "Impressum", href: "/impressum" },
      { text: " und " },
      { text: "Cloudflare", href: "https://www.cloudflare.com/privacypolicy/" },
      { text: "." },
    ]);
    expect(splitInline("kein Link")).toEqual([{ text: "kein Link" }]);
  });

  it("prerenders the whole notice with localized internal links", () => {
    const route = SEO_ROUTES.find((entry) => entry.path === "/privacy")!;
    const de = renderRoutePage(TEMPLATE, route, messages.de, "de");
    const en = renderRoutePage(TEMPLATE, route, messages.en, "en");

    expect(de).toContain("<h2>6. Kontakt per E-Mail</h2>");
    expect(de).toContain('<a href="/impressum">Impressum</a>');
    expect(en).toContain("<h2>6. Contact by e-mail</h2>");
    expect(en).toContain('<a href="/en/imprint">imprint</a>');
    expect(en).not.toContain("[imprint]");
  });
});
