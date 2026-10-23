import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { messages } from "../../src/i18n.js";
import { WORLDS } from "../../src/seo/page-bodies.js";

describe("worlds on the landing page", () => {
  it("shows a first selection and links to the ideas page with all worlds", async () => {
    const source = await readFile("src/components/LandingPage.tsx", "utf8");
    expect(source).toContain("const FEATURED_WORLD_COUNT = 6;");
    expect(source).toContain("WORLDS.slice(0, FEATURED_WORLD_COUNT)");
    expect(source).toContain('href={path("/ideas")}');
    expect(WORLDS.length).toBeGreaterThan(6);
  });

  it("names the total number of worlds in the link text in both languages", () => {
    for (const language of ["de", "en"] as const) {
      expect(messages[language]["landing.worlds.all"]).toContain("{count}");
    }
  });

  it("keeps every world linked in the prerendered landing text for search engines", async () => {
    const { renderRoutePage } = await import("../../src/seo/render.js");
    const { SEO_ROUTES } = await import("../../src/seo/routes.js");
    const template = '<html lang="de"><head><meta name="description" content="x" /><title>x</title></head><body><div id="root"></div></body></html>';
    const html = renderRoutePage(template, SEO_ROUTES.find((route) => route.path === "/")!, messages.de, "de");
    for (const world of WORLDS) expect(html).toContain(`href="/ideas/${world.id}"`);
  });
});
