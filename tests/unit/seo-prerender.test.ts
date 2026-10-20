import { describe, expect, it } from "vitest";
import { messages } from "../../src/i18n.js";
import { renderRobotsTxt, renderRoutePage, renderSitemapXml } from "../../src/seo/render.js";
import { SEO_ROUTES, canonicalUrl } from "../../src/seo/routes.js";

const TEMPLATE = [
  "<!doctype html>",
  '<html lang="de">',
  "  <head>",
  '    <meta name="description" content="placeholder" />',
  "    <title>FigForge</title>",
  "  </head>",
  "  <body>",
  '    <div id="root"></div>',
  "  </body>",
  "</html>",
].join("\n");

describe("SEO prerendering", () => {
  it("has German and English copy for every route key", () => {
    for (const route of SEO_ROUTES) {
      for (const key of [route.titleKey, route.descriptionKey, route.headingKey, route.ledeKey]) {
        expect(messages.de[key], `de ${key}`).toBeTruthy();
        expect(messages.en[key], `en ${key}`).toBeTruthy();
      }
    }
  });

  it("gives every route its own title, description and canonical URL", () => {
    const titles = new Set<string>();
    for (const route of SEO_ROUTES.filter((entry) => entry.indexable)) {
      const html = renderRoutePage(TEMPLATE, route, messages.de);
      const title = /<title>([^<]*)<\/title>/u.exec(html)?.[1];
      expect(title).toBeTruthy();
      titles.add(title ?? "");
      expect(html).not.toContain("placeholder");
      expect(html).toContain(`<link rel="canonical" href="${canonicalUrl(route.path)}" />`);
      expect(html).toMatch(/<div id="root"><main><h1>[^<]+<\/h1><p>[^<]+<\/p><\/main><\/div>/u);
      expect(html).not.toContain('content="noindex"');
    }
    expect(titles.size).toBe(SEO_ROUTES.filter((entry) => entry.indexable).length);
  });

  it("marks local-only routes noindex and keeps them out of the sitemap", () => {
    const collection = SEO_ROUTES.find((route) => route.path === "/collection");
    expect(collection?.indexable).toBe(false);
    expect(renderRoutePage(TEMPLATE, collection!, messages.de)).toContain('<meta name="robots" content="noindex" />');
    expect(renderSitemapXml()).not.toContain("/collection");
    expect(renderSitemapXml()).toContain("<loc>https://createyourminifig.com/ideas/pirates</loc>");
  });

  it("escapes copy and points robots.txt at the sitemap", () => {
    const route = { ...SEO_ROUTES[0]!, headingKey: "x.h", titleKey: "x.t", descriptionKey: "x.d", ledeKey: "x.l" };
    const html = renderRoutePage(TEMPLATE, route, { "x.h": "A <b>", "x.t": 'Q "T"', "x.d": "a & b", "x.l": "l" });
    expect(html).toContain("<h1>A &lt;b&gt;</h1>");
    expect(html).toContain("<title>Q &quot;T&quot;</title>");
    expect(html).toContain('content="a &amp; b"');
    expect(renderRobotsTxt()).toContain("Sitemap: https://createyourminifig.com/sitemap.xml");
  });

  it("fails loudly when copy is missing", () => {
    expect(() => renderRoutePage(TEMPLATE, SEO_ROUTES[0]!, {})).toThrow(/Missing German message/u);
  });
});

describe("landing and builder routes", () => {
  it("prerenders the landing page at / and the builder at /builder", () => {
    const landing = renderRoutePage(TEMPLATE, SEO_ROUTES.find((route) => route.path === "/")!, messages.de);
    const builder = renderRoutePage(TEMPLATE, SEO_ROUTES.find((route) => route.path === "/builder")!, messages.de);
    expect(landing).toContain("<h1>Stelle deine Minifigur aus echten Teilen zusammen.</h1>");
    expect(builder).toContain("<h1>Baue den Charakter, den du dir vorstellst.</h1>");
    expect(renderSitemapXml()).toContain("<loc>https://createyourminifig.com/builder</loc>");
  });
});

describe("English pages", () => {
  const route = (path: string) => SEO_ROUTES.find((entry) => entry.path === path)!;

  it("renders English copy, language and canonical under /en", () => {
    const html = renderRoutePage(TEMPLATE, route("/ideas/pirates"), messages.en, "en");

    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>Customizable pirate minifigure ideas | FigForge</title>");
    expect(html).toContain('<link rel="canonical" href="https://createyourminifig.com/en/ideas/pirates" />');
    expect(html).toContain('<meta property="og:locale" content="en_US" />');
    expect(html).toContain('<meta property="og:locale:alternate" content="de_DE" />');
  });

  it("links both language versions and the German default with hreflang", () => {
    for (const language of ["de", "en"] as const) {
      const html = renderRoutePage(TEMPLATE, route("/builder"), messages[language], language);
      expect(html).toContain('hreflang="de" href="https://createyourminifig.com/builder"');
      expect(html).toContain('hreflang="en" href="https://createyourminifig.com/en/builder"');
      expect(html).toContain('hreflang="x-default" href="https://createyourminifig.com/builder"');
    }
  });

  it("keeps the local-only collection page out of search in both languages", () => {
    const html = renderRoutePage(TEMPLATE, route("/collection"), messages.en, "en");
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).not.toContain("hreflang");
    expect(renderSitemapXml()).not.toContain("collection");
  });

  it("lists every indexable page in both languages with alternates in the sitemap", () => {
    const sitemap = renderSitemapXml();
    const indexable = SEO_ROUTES.filter((entry) => entry.indexable).length;

    expect(sitemap.match(/<loc>/gu)).toHaveLength(indexable * 2);
    expect(sitemap).toContain("<loc>https://createyourminifig.com/en/</loc>");
    expect(sitemap).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(sitemap).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://createyourminifig.com/en/ideas/space"/>');
  });
});
