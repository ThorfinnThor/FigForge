import { describe, expect, it } from "vitest";
import {
  AMAZON_AFFILIATE_CONFIG,
  validateAmazonAffiliateConfig,
} from "../../src/procurement/amazon-config.js";
import { amazonProductLink, amazonSearchLink } from "../../src/procurement/amazon-links.js";

describe("Amazon recommendation links", () => {
  it("adds a valid Associates tag to an allowlisted Amazon search link", () => {
    const link = amazonSearchLink(
      "minifigure display",
      AMAZON_AFFILIATE_CONFIG.trackingId,
      AMAZON_AFFILIATE_CONFIG.searchUrl,
    );
    expect(link.affiliate).toBe(true);
    expect(link.href).toBe("https://www.amazon.de/s?k=minifigure+display&tag=figforge-21");
  });

  it("records the verified Germany-to-US OneLink mapping", () => {
    expect(() => validateAmazonAffiliateConfig(AMAZON_AFFILIATE_CONFIG)).not.toThrow();
    expect(AMAZON_AFFILIATE_CONFIG.oneLink).toMatchObject({
      enabled: true,
      sourceStoreId: "seitenhafen36-21",
      destinationStoreIds: { "amazon.com": "seitenhafen36-20" },
      redirectPreference: "close-match",
      checkedAt: "2026-10-13",
    });
  });

  it("creates a clean affiliate product link from a validated ASIN", () => {
    expect(amazonProductLink("B0BBRYHTPS", "figforge-21")).toEqual({
      href: "https://www.amazon.de/dp/B0BBRYHTPS?tag=figforge-21",
      affiliate: true,
    });
  });

  it("falls back safely and never forwards an invalid tag or host", () => {
    const link = amazonSearchLink("storage", "bad tag!", "https://example.com/collect");
    expect(link).toEqual({ href: "https://www.amazon.de/s?k=storage", affiliate: false });
  });
});
