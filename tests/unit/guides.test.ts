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

describe("facts in the newer guides", () => {
  const read = async (path: string): Promise<unknown> => {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(new URL(`../../${path}`, import.meta.url), "utf8")) as unknown;
  };

  it("renders step lists as numbered lists in the prerendered HTML", () => {
    const route = SEO_ROUTES.find((entry) => entry.path === guidePath("bricklink", "de"))!;
    const html = renderRoutePage(TEMPLATE, route, messages.de, "de");
    expect(html).toMatch(/<h2>Schritt für Schritt<\/h2><ol><li>/u);
    expect(html).toContain("<h2>Fehlermeldung „Content is not allowed in prolog“</h2>");
  });

  it("quotes color numbers that match the catalog's shop export data", async () => {
    const data = await read("data/generated/shop-export/torso-assembly.json") as {
      entries: Array<{ colors: Array<{ rebrickableColorId: number; colorName: string; bricklinkColorId: number | null }> }>;
    };
    const known = new Map<string, { rebrickable: number; bricklink: number | null }>();
    for (const entry of data.entries) {
      for (const color of entry.colors) known.set(color.colorName, { rebrickable: color.rebrickableColorId, bricklink: color.bricklinkColorId });
    }
    const lines = GUIDE_SECTIONS.colors.de.flatMap((section) => section.items ?? [])
      .filter((item) => /bei Rebrickable \d+, bei BrickLink \d+/u.test(item));
    expect(lines.length).toBeGreaterThanOrEqual(6);
    for (const line of lines) {
      const [, name, rebrickable, bricklink] = /^(.+): bei Rebrickable (\d+), bei BrickLink (\d+)$/u.exec(line)!;
      expect(known.get(name!), name).toEqual({ rebrickable: Number(rebrickable), bricklink: Number(bricklink) });
    }
  });

  it("quotes the pirate captain's parts exactly as the catalog names them", async () => {
    const roles = ["head", "headwear", "torso-assembly", "legs-assembly", "hand-accessory"];
    const names = new Map<string, string>();
    for (const role of roles) {
      const data = await read(`data/generated/catalog-packages/${role}.json`) as { parts: Array<{ rebrickablePartNum: string; name: string }> };
      // The article leaves out bracketed build hints such as "[Blocked Open Stud]", like the app does.
      for (const part of data.parts) names.set(part.rebrickablePartNum, part.name.replace(/\s*\[[^\]]*\]$/u, ""));
    }
    const items = GUIDE_SECTIONS.anatomy.de.flatMap((section) => section.items ?? []).filter((item) => /, \d.*: /u.test(item));
    expect(items).toHaveLength(5);
    for (const item of items) {
      const [, number, name] = /^[^,]+, (\S+): (.+)$/u.exec(item)!;
      expect(names.get(number!), number).toBe(name);
    }
  });
});

