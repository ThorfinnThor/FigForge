import { describe, expect, it } from "vitest";
import { GUIDE_SLUGS, germanPath, guideIdFromPath, guidePath, localizedPath } from "../../src/app/routing.js";
import { GUIDE_IDS, GUIDE_SECTIONS } from "../../src/guides/guide-content.js";
import { messages } from "../../src/i18n.js";
import { renderRoutePage, renderSitemapXml } from "../../src/seo/render.js";
import { SEO_ROUTES } from "../../src/seo/routes.js";

const TEMPLATE = '<html lang="de"><head><meta name="description" content="x" /><title>x</title></head><body><div id="root"></div></body></html>';

describe("guides", () => {
  it("has a German and an English slug per guide and maps paths both ways", () => {
    expect(GUIDE_IDS).toEqual(Object.keys(GUIDE_SLUGS));
    for (const id of GUIDE_IDS) {
      const de = guidePath(id, "de");
      const en = guidePath(id, "en");
      expect(de.startsWith("/ratgeber/")).toBe(true);
      expect(en.startsWith("/en/guides/")).toBe(true);
      expect(localizedPath(de, "en")).toBe(en);
      expect(germanPath(en)).toBe(de);
      expect(guideIdFromPath(en)).toBe(id);
      expect(guideIdFromPath(`${de}/`)).toBe(id);
    }
    expect(localizedPath("/ratgeber", "en")).toBe("/en/guides");
    expect(germanPath("/en/guides/")).toBe("/ratgeber");
    expect(guideIdFromPath("/ratgeber")).toBeNull();
  });

  it("has copy for every guide in both languages", () => {
    for (const id of GUIDE_IDS) {
      for (const language of ["de", "en"] as const) {
        for (const key of ["metaTitle", "metaDescription", "title", "lede"]) {
          expect(messages[language][`guide.${id}.${key}`], `${language} ${id} ${key}`).toBeTruthy();
        }
        const sections = GUIDE_SECTIONS[id][language];
        expect(sections.length).toBeGreaterThanOrEqual(4);
        for (const section of sections) {
          expect(section.heading.length).toBeGreaterThan(3);
          expect((section.paragraphs?.length ?? 0) + (section.items?.length ?? 0)).toBeGreaterThan(0);
        }
        expect(messages[language][`guide.${id}.metaDescription`]!.length).toBeLessThanOrEqual(170);
      }
      expect(GUIDE_SECTIONS[id].de.length).toBe(GUIDE_SECTIONS[id].en.length);
    }
  });

  it("prerenders the full guide text, in the right language", () => {
    const route = SEO_ROUTES.find((entry) => entry.path === guidePath("part-numbers", "de"))!;
    const de = renderRoutePage(TEMPLATE, route, messages.de, "de");
    const en = renderRoutePage(TEMPLATE, route, messages.en, "en");

    expect(de).toContain("<article><h1>Minifiguren-Teilenummern verstehen</h1>");
    expect(de).toContain("<h2>pr, pb und pat: Aufdruck und Muster</h2>");
    expect(de).toContain("3626cpr0001");
    expect(en).toContain("<article><h1>Understand minifigure part numbers</h1>");
    expect(en).toContain('href="https://createyourminifig.com/en/guides/understand-part-numbers"');
    expect(en).toContain('hreflang="de" href="https://createyourminifig.com/ratgeber/teilenummern-verstehen"');
  });

  it("lists the guides on the hub page and in the sitemap", () => {
    const hub = SEO_ROUTES.find((entry) => entry.path === "/ratgeber")!;
    const html = renderRoutePage(TEMPLATE, hub, messages.en, "en");

    for (const id of GUIDE_IDS) expect(html).toContain(`href="${guidePath(id, "en")}"`);
    const sitemap = renderSitemapXml();
    expect(sitemap).toContain("<loc>https://createyourminifig.com/ratgeber/minifigur-verschenken</loc>");
    expect(sitemap).toContain("<loc>https://createyourminifig.com/en/guides/minifigure-gift</loc>");
  });
});
