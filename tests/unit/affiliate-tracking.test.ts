import { describe, expect, it } from "vitest";
import { disableAnalytics, loadAnalytics, sendAnalyticsEvent, type AnalyticsEnvironment } from "../../src/consent/analytics.js";
import { AMAZON_AFFILIATE_CONFIG, amazonTrackingIdFor } from "../../src/procurement/amazon-config.js";
import { GUIDE_IDS, GUIDE_SECTIONS } from "../../src/guides/guide-content.js";
import { GUIDE_PRODUCTS } from "../../src/guides/guide-products.js";
import { legoProductLink } from "../../src/procurement/lego-affiliate.js";
import { CURATED_PRODUCTS } from "../../src/products/curated-products.js";

const ID = "G-TEST123456";
const environment = (): AnalyticsEnvironment => ({
  win: {},
  doc: {
    createElement: () => ({ async: false, src: "" }),
    head: { append: () => undefined },
    cookie: "",
  },
  hostname: "createyourminifig.com",
});
const queued = (env: AnalyticsEnvironment): unknown[][] =>
  (env.win.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));

describe("affiliate click events", () => {
  const params = { partner: "amazon", placement: "sets", item: "space-shuttle", affiliate: true };

  it("send nothing before the visitor agreed", () => {
    const env = environment();
    expect(sendAnalyticsEvent(ID, "affiliate_click", params, env)).toBe(false);
    expect(env.win.dataLayer).toBeUndefined();
  });

  it("are queued with their details once analytics is loaded", () => {
    const env = environment();
    loadAnalytics(ID, env);
    expect(sendAnalyticsEvent(ID, "affiliate_click", params, env)).toBe(true);
    expect(queued(env).at(-1)).toEqual(["event", "affiliate_click", params]);
  });

  it("stop at once after the consent is withdrawn", () => {
    const env = environment();
    loadAnalytics(ID, env);
    disableAnalytics(ID, env);
    const before = queued(env).length;
    expect(sendAnalyticsEvent(ID, "affiliate_click", params, env)).toBe(false);
    expect(queued(env)).toHaveLength(before);
  });
});

describe("placement tracking IDs", () => {
  it("fall back to the main Amazon tracking ID and accept only well-formed own IDs", () => {
    const config = { trackingId: "figforge-21", placementTrackingIds: { sets: "figforge-sets-21", broken: "x y" } };
    expect(amazonTrackingIdFor("sets", config)).toBe("figforge-sets-21");
    expect(amazonTrackingIdFor("builder", config)).toBe("figforge-21");
    expect(amazonTrackingIdFor("broken", config)).toBe("figforge-21");
    expect(amazonTrackingIdFor("sets")).toBe(AMAZON_AFFILIATE_CONFIG.trackingId);
  });

  it("add the placement to a Rakuten deep link as sub-ID, but never to a plain link", () => {
    const templates = { eu: "https://click.linksynergy.com/deeplink?id=P&mid=50641&murl={url}", uk: null };
    const product = "https://www.lego.com/en-de/product/space-shuttle-31134";
    const market = { locale: "de-de", region: "eu" } as const;
    expect(legoProductLink(product, market, templates, "guide-gift").href).toMatch(/&u1=guide-gift$/u);
    expect(legoProductLink(product, market, templates, "Bad Placement!").href).not.toContain("u1=");
    expect(legoProductLink(product, market, templates).href).not.toContain("u1=");
    expect(legoProductLink(product, market, { eu: null, uk: null }, "sets").href).not.toContain("u1=");
  });
});

describe("products under guides", () => {
  it("name existing products and only guides that exist, leaving the how-to guides without ads", () => {
    const productIds = new Set(CURATED_PRODUCTS.map((product) => product.id));
    for (const [guide, ids] of Object.entries(GUIDE_PRODUCTS)) {
      expect(GUIDE_IDS, guide).toContain(guide);
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) expect(productIds.has(id), id).toBe(true);
    }
    for (const how of ["order", "bricklink", "pick-a-brick", "colors", "part-numbers"] as const) {
      expect(GUIDE_PRODUCTS[how], how).toBeUndefined();
      expect(GUIDE_SECTIONS[how].de.length).toBeGreaterThan(0);
    }
  });
});
