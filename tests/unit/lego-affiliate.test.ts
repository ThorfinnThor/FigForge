import { describe, expect, it } from "vitest";
import { messages } from "../../src/i18n.js";
import { privacySections } from "../../src/privacy/privacy-content.js";
import {
  LEGO_AFFILIATE_TEMPLATES,
  isLegoAffiliateActive,
  isValidAffiliateTemplate,
  legoProductLink,
  marketFromLanguages,
} from "../../src/procurement/lego-affiliate.js";
import { CURATED_PRODUCTS } from "../../src/products/curated-products.js";
import { renderRoutePage } from "../../src/seo/render.js";
import { SEO_ROUTES } from "../../src/seo/routes.js";

const TEMPLATE_EU = "https://click.linksynergy.com/deeplink?id=PUBLISHER&mid=50641&murl={url}";
const TEMPLATE_UK = "https://click.linksynergy.com/deeplink?id=PUBLISHER&mid=24340&murl={url}";
const PRODUCT = "https://www.lego.com/en-de/product/iconic-pirate-ship-31387";

describe("market from the browser language", () => {
  it("takes the first language that names a known country", () => {
    expect(marketFromLanguages(["en-GB", "en"], "en")).toEqual({ locale: "en-gb", region: "uk" });
    expect(marketFromLanguages(["de-AT", "de"], "de")).toEqual({ locale: "de-at", region: "eu" });
    expect(marketFromLanguages(["xx-YY", "de-DE"], "en")).toEqual({ locale: "de-de", region: "eu" });
    expect(marketFromLanguages(["en-US"], "en")).toEqual({ locale: "en-us", region: null });
  });

  it("falls back to the German shop only on the German page", () => {
    expect(marketFromLanguages(["de"], "de")).toEqual({ locale: "de-de", region: "eu" });
    expect(marketFromLanguages([], "de")).toEqual({ locale: "de-de", region: "eu" });
    expect(marketFromLanguages(["en"], "en")).toBeNull();
    expect(marketFromLanguages(["zh-Hans-CN"], "en")).toBeNull();
  });
});

describe("LEGO product links", () => {
  it("leaves the link alone when there is no market or it is not a LEGO shop address", () => {
    expect(legoProductLink(PRODUCT, null, { eu: TEMPLATE_EU, uk: TEMPLATE_UK })).toEqual({ href: PRODUCT, affiliate: false });
    expect(legoProductLink("https://example.com/en-de/x", { locale: "en-gb", region: "uk" }).href).toBe("https://example.com/en-de/x");
  });

  it("points to the visitor's shop and gives plain links while no program is entered", () => {
    expect(legoProductLink(PRODUCT, { locale: "en-gb", region: "uk" })).toEqual({
      href: "https://www.lego.com/en-gb/product/iconic-pirate-ship-31387",
      affiliate: false,
    });
  });

  it("wraps the localized address in the program's deep link when one is entered", () => {
    const link = legoProductLink(PRODUCT, { locale: "de-at", region: "eu" }, { eu: TEMPLATE_EU, uk: null });
    expect(link.affiliate).toBe(true);
    expect(link.href).toBe(`https://click.linksynergy.com/deeplink?id=PUBLISHER&mid=50641&murl=${encodeURIComponent("https://www.lego.com/de-at/product/iconic-pirate-ship-31387")}`);
    expect(legoProductLink(PRODUCT, { locale: "en-us", region: null }, { eu: TEMPLATE_EU, uk: TEMPLATE_UK }).affiliate).toBe(false);
    expect(legoProductLink(PRODUCT, { locale: "en-gb", region: "uk" }, { eu: TEMPLATE_EU, uk: null }).affiliate).toBe(false);
  });

  it("accepts only https Rakuten deep-link templates with exactly one placeholder", () => {
    expect(isValidAffiliateTemplate(TEMPLATE_EU)).toBe(true);
    for (const bad of [
      null,
      "",
      "http://click.linksynergy.com/deeplink?id=A&murl={url}",
      "https://evil.example/deeplink?murl={url}",
      "https://click.linksynergy.com/deeplink?id=A",
      "https://click.linksynergy.com/deeplink?id=A&murl={url}&x={url}",
      "javascript:alert({url})",
    ]) {
      expect(isValidAffiliateTemplate(bad), String(bad)).toBe(false);
    }
  });

  it("keeps every curated product link in a shape the rewrite understands", () => {
    for (const product of CURATED_PRODUCTS.filter((entry) => entry.officialUrl)) {
      const link = legoProductLink(product.officialUrl!, { locale: "en-gb", region: null });
      expect(link.href, product.id).toMatch(/^https:\/\/www\.lego\.com\/en-gb\/product\//u);
    }
  });
});

describe("privacy notice follows the affiliate switch", () => {
  const externalText = (language: "de" | "en", active: boolean): string =>
    privacySections(language, false, active).find((section) => section.id === "external")!.paragraphs!.join("\n");

  it("mentions Rakuten Advertising only while LEGO partner links are active", () => {
    for (const language of ["de", "en"] as const) {
      expect(externalText(language, false)).not.toContain("Rakuten");
      const text = externalText(language, true);
      expect(text).toContain("Rakuten Advertising");
      expect(text).toContain("LEGO");
    }
  });

  it("is switched off in the shipped configuration and on as soon as a template is entered", () => {
    expect(isLegoAffiliateActive(LEGO_AFFILIATE_TEMPLATES)).toBe(isLegoAffiliateActive());
    expect(isLegoAffiliateActive({ eu: null, uk: null })).toBe(false);
    expect(isLegoAffiliateActive({ eu: TEMPLATE_EU, uk: null })).toBe(true);
  });

  it("is in the prerendered privacy page when the build has partner links", () => {
    const route = SEO_ROUTES.find((entry) => entry.path === "/privacy")!;
    const template = '<html lang="de"><head><meta name="description" content="x" /><title>x</title></head><body><div id="root"></div></body></html>';
    expect(renderRoutePage(template, route, messages.de, "de", { legoAffiliate: true })).toContain("Rakuten Advertising");
    expect(renderRoutePage(template, route, messages.de, "de")).not.toContain("Rakuten");
  });
});
