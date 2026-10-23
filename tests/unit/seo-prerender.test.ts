import { describe, expect, it } from "vitest";
import { messages } from "../../src/i18n.js";
import { FIGURE_TEMPLATES } from "../../src/ideas/figure-templates.js";
import { partNumbers } from "../../src/ideas/part-numbers.js";
import { CURATED_PRODUCTS, productsForTheme } from "../../src/products/curated-products.js";
import { render404Page, renderLlmsTxt, renderRobotsTxt, renderRoutePage, renderSitemapXml } from "../../src/seo/render.js";
import { SEO_ROUTES, canonicalUrl, routePath } from "../../src/seo/routes.js";

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
      expect(html).toMatch(/<div id="root"><main>(?:<article>)?<h1>[^<]+<\/h1><p>[^<]+<\/p>/u);
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
    // The collection page has no extra body text, so only the head and heading copy are under test here.
    const route = { ...SEO_ROUTES.find((entry) => entry.path === "/collection")!, headingKey: "x.h", titleKey: "x.t", descriptionKey: "x.d", ledeKey: "x.l" };
    const html = renderRoutePage(TEMPLATE, route, { "x.h": "A <b>", "x.t": 'Q "T"', "x.d": "a & b", "x.l": "l", "seo.ogImageAlt": "alt" });
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
    expect(html).toContain("<title>Customizable pirate minifigure ideas | Create Your Minifig</title>");
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
    expect(sitemap).toContain("<loc>https://createyourminifig.com/en</loc>");
    expect(sitemap).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(sitemap).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://createyourminifig.com/en/ideas/space"/>');
  });
});

describe("imprint", () => {
  const imprint = SEO_ROUTES.find((entry) => entry.path === "/impressum")!;

  it("is reachable at /impressum and /en/imprint with the mandatory details in the HTML", () => {
    const de = renderRoutePage(TEMPLATE, imprint, messages.de, "de");
    const en = renderRoutePage(TEMPLATE, imprint, messages.en, "en");

    for (const html of [de, en]) {
      expect(html).toContain("SeitenHafen361");
      expect(html).toContain("Schayan Yousefian");
      expect(html).toContain("Freienwalder Str. 34");
      expect(html).toContain("13359 Berlin");
      expect(html).toContain("contact@createyourminifig.com");
    }
    expect(de).toContain("<h2>Diensteanbieter</h2>");
    expect(de).toContain('<link rel="canonical" href="https://createyourminifig.com/impressum" />');
    expect(en).toContain("<h2>Service provider</h2>");
    expect(de).toContain("<h2>Hinweis zu Marken und Rechten</h2>");
    expect(de).toContain("weder hergestellt noch gesponsert, autorisiert oder unterstützt");
    expect(en).toContain("<h2>Trademarks and rights</h2>");
    expect(en).toContain("not made, sponsored, authorized or endorsed by it");
    for (const html of [de, en]) expect(html).toContain("LEGO®");
    expect(en).toContain('<link rel="canonical" href="https://createyourminifig.com/en/imprint" />');
  });
});

describe("full text of content pages", () => {
  const route = (path: string) => SEO_ROUTES.find((entry) => entry.path === path)!;
  const render = (path: string, language: "de" | "en") =>
    renderRoutePage(TEMPLATE, route(path), messages[language], language);
  const plain = (html: string): string => html.replace(/<[^>]+>/gu, " ").replace(/&quot;/gu, '"').replace(/&amp;/gu, "&");

  it("lists steps, worlds, guides and the LEGO notice on the landing page in both languages", () => {
    for (const language of ["de", "en"] as const) {
      const html = render("/", language);
      const prefix = language === "en" ? "/en" : "";
      expect(html).toContain(`href="${prefix}/builder"`);
      expect(html).toContain(`href="${prefix}/ideas/pirates"`);
      expect(html).toContain(`href="${prefix}/${language === "en" ? "guides" : "ratgeber"}/`);
      expect(html).toContain(language === "en" ? 'href="/en/imprint"' : 'href="/impressum"');
      for (const key of ["landing.step.pick.title", "landing.fact.local.title", "landing.legal"]) {
        expect(plain(html)).toContain(plain(messages[language][key]!));
      }
    }
  });

  it("lists every starter figure and every world on the ideas page", () => {
    for (const language of ["de", "en"] as const) {
      const html = render("/ideas", language);
      for (const template of FIGURE_TEMPLATES) {
        expect(plain(html)).toContain(plain(messages[language][template.nameKey]!));
        expect(html).toContain(`?template=${template.id}`);
      }
      for (const world of ["pirates", "castle", "space", "fire-rescue", "zombies", "fantasy", "vikings", "egypt", "monsters", "wildwest", "ninja", "jungle"]) {
        expect(html).toContain(`/ideas/${world}"`);
      }
    }
  });

  it("gives a theme page its figures with LDraw numbers, the tip and matching sets", () => {
    const html = render("/ideas/pirates", "de");
    const figures = FIGURE_TEMPLATES.filter((template) => template.themeId === "pirates");
    expect(figures.length).toBeGreaterThan(0);
    for (const template of figures) {
      expect(plain(html)).toContain(plain(messages.de[template.nameKey]!));
      for (const { number } of partNumbers(template)) expect(html).toContain(`<dd>${number}</dd>`);
    }
    expect(plain(html)).toContain(plain(messages.de["ideas.world.pirates.tip"]!));
    for (const product of productsForTheme("pirates")) {
      expect(plain(html)).toContain(plain(messages.de[product.titleKey]!));
    }
    expect(html).not.toContain("amazon");
    const other = render("/ideas/space", "de");
    expect(other).not.toContain(messages.de["ideas.world.pirates.tip"]!);
  });

  it("lists every curated set and accessory on the sets page", () => {
    for (const language of ["de", "en"] as const) {
      const html = plain(render("/sets", language));
      for (const product of CURATED_PRODUCTS) expect(html).toContain(plain(messages[language][product.titleKey]!));
    }
  });

  it("carries the method text and license links on the methodology page", () => {
    for (const language of ["de", "en"] as const) {
      const html = render("/methodology", language);
      for (const key of ["source.note", "methodology.assembly", "methodology.physical", "methodology.localStorage", "methodology.figureExport"]) {
        expect(plain(html)).toContain(plain(messages[language][key]!));
      }
      expect(html).toContain('href="/licenses/LDraw-CAreadme.txt"');
    }
  });
});

describe("sharing tags and structured data", () => {
  const route = (path: string) => SEO_ROUTES.find((entry) => entry.path === path)!;
  const graphOf = (html: string): Array<Record<string, unknown>> => {
    const raw = /<script type="application\/ld\+json">(.*?)<\/script>/su.exec(html)?.[1];
    expect(raw, "ld+json script").toBeTruthy();
    const parsed = JSON.parse(raw!) as { "@context": string; "@graph": Array<Record<string, unknown>> };
    expect(parsed["@context"]).toBe("https://schema.org");
    return parsed["@graph"];
  };

  it("gives every page an Open Graph image and Twitter card in its own language", () => {
    const de = renderRoutePage(TEMPLATE, route("/ideas"), messages.de, "de");
    const en = renderRoutePage(TEMPLATE, route("/ideas"), messages.en, "en");
    expect(de).toContain('<meta property="og:image" content="https://createyourminifig.com/og-image.png" />');
    expect(en).toContain('<meta property="og:image" content="https://createyourminifig.com/og-image-en.png" />');
    for (const html of [de, en]) {
      expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
      expect(html).toContain('<meta property="og:image:width" content="1200" />');
      expect(html).toMatch(/<meta property="og:image:alt" content="[^"]{20,}" \/>/u);
    }
  });

  it("ships the two social images as 1200 x 630 PNG files", async () => {
    const { readFile } = await import("node:fs/promises");
    for (const name of ["og-image.png", "og-image-en.png"]) {
      const bytes = await readFile(new URL(`../../public/${name}`, import.meta.url));
      expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
      expect(bytes.readUInt32BE(16)).toBe(1200);
      expect(bytes.readUInt32BE(20)).toBe(630);
    }
  });

  it("describes the site and organization on the home page", () => {
    const graph = graphOf(renderRoutePage(TEMPLATE, route("/"), messages.de, "de"));
    const types = graph.map((node) => node["@type"]);
    expect(types).toEqual(["WebSite", "Organization"]);
    expect(graph[0]).toMatchObject({ name: "Create Your Minifig", alternateName: "FigForge", inLanguage: "de", url: "https://createyourminifig.com/" });
  });

  it("describes the builder as a free web application with a breadcrumb", () => {
    const graph = graphOf(renderRoutePage(TEMPLATE, route("/builder"), messages.en, "en"));
    const app = graph.find((node) => node["@type"] === "WebApplication");
    expect(app).toMatchObject({ isAccessibleForFree: true, inLanguage: "en", url: "https://createyourminifig.com/en/builder" });
    const crumbs = graph.find((node) => node["@type"] === "BreadcrumbList") as { itemListElement: Array<{ position: number; item: string }> };
    expect(crumbs.itemListElement.map((entry) => entry.item)).toEqual([
      "https://createyourminifig.com/en",
      "https://createyourminifig.com/en/builder",
    ]);
  });

  it("marks guides as articles with dates and a three-step breadcrumb", () => {
    const graph = graphOf(renderRoutePage(TEMPLATE, route("/ratgeber/minifiguren-teile-bestellen"), messages.de, "de"));
    const article = graph.find((node) => node["@type"] === "Article");
    expect(article).toMatchObject({
      inLanguage: "de",
      mainEntityOfPage: "https://createyourminifig.com/ratgeber/minifiguren-teile-bestellen",
    });
    for (const field of ["datePublished", "dateModified"]) {
      expect(String(article![field])).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    }
    expect(String(article!.headline)).not.toContain("| Create Your Minifig");
    const crumbs = graph.find((node) => node["@type"] === "BreadcrumbList") as { itemListElement: unknown[] };
    expect(crumbs.itemListElement).toHaveLength(3);
  });

  it("keeps structured data off noindex pages and cannot be broken out of the script element", () => {
    expect(renderRoutePage(TEMPLATE, route("/collection"), messages.de, "de")).not.toContain("ld+json");
    const hostile = { ...route("/builder"), titleKey: "x.t", descriptionKey: "x.d", headingKey: "x.h", ledeKey: "x.l" };
    const html = renderRoutePage(TEMPLATE, hostile, { ...messages.de, "x.h": "</script><b>", "x.t": "t", "x.d": "d", "x.l": "l" });
    expect(html.match(/<\/script>/gu)).toHaveLength(1);
    expect(graphOf(html).some((node) => JSON.stringify(node).includes("</script>"))).toBe(true);
  });
});

describe("404 pages and llms.txt", () => {
  it("renders a 404 page that does not start the app", () => {
    const withApp = TEMPLATE.replace("</head>", '<script type="module" crossorigin src="/assets/index-x.js"></script></head>');
    const de = render404Page(withApp, messages.de, "de");
    const en = render404Page(withApp, messages.en, "en");
    for (const html of [de, en]) {
      expect(html).not.toContain('type="module"');
      expect(html).toContain('<meta name="robots" content="noindex" />');
    }
    expect(de).toContain("Diese Seite gibt es nicht.");
    expect(de).toContain('href="/builder"');
    expect(en).toContain('<html lang="en">');
    expect(en).toContain('href="/en/builder"');
  });

  it("uses addresses without a trailing slash everywhere, matching what Cloudflare serves", async () => {
    const { readFile } = await import("node:fs/promises");
    const config = await readFile(new URL("../../wrangler.jsonc", import.meta.url), "utf8");
    expect(config).toContain('"html_handling": "drop-trailing-slash"');
    for (const route of SEO_ROUTES) {
      for (const language of ["de", "en"] as const) {
        const url = canonicalUrl(routePath(route, language));
        expect(url === "https://createyourminifig.com/" || !url.endsWith("/"), url).toBe(true);
      }
    }
    expect(canonicalUrl(routePath(SEO_ROUTES[0]!, "en"))).toBe("https://createyourminifig.com/en");
  });

  it("lets Cloudflare answer unknown addresses with the 404 page instead of the app", async () => {
    const { readFile } = await import("node:fs/promises");
    const config = await readFile(new URL("../../wrangler.jsonc", import.meta.url), "utf8");
    expect(config).toContain('"not_found_handling": "404-page"');
    expect(config).not.toContain("single-page-application");
  });

  it("describes the site in llms.txt and lists the pages and guides in both languages", () => {
    const text = renderLlmsTxt(messages);
    expect(text.startsWith("# Create Your Minifig\n")).toBe(true);
    expect(text).toContain("https://createyourminifig.com/builder");
    expect(text).toContain("https://createyourminifig.com/en/guides/order-minifigure-parts");
    expect(text).toContain("ohne Verbindung zur LEGO Gruppe");
    expect(text).toContain("no connection to the LEGO Group");
    expect(text).not.toContain("/collection");
  });
});
