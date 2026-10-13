export interface AmazonAffiliateConfig {
  enabled: boolean;
  marketplace: "amazon.de";
  searchUrl: "https://www.amazon.de/s";
  trackingId: string;
  oneLink: {
    enabled: boolean;
    sourceStoreId: string;
    destinationStoreIds: {
      "amazon.com": string;
    };
    redirectPreference: "exact-match" | "close-match";
    checkedAt: string;
  };
}

/**
 * Public Amazon Associates configuration.
 *
 * Tracking and store IDs are intentionally versioned because they are already
 * visible in every outgoing affiliate URL. OneLink performs the eligible
 * marketplace redirect and substitutes the linked destination tracking ID.
 */
export const AMAZON_AFFILIATE_CONFIG: AmazonAffiliateConfig = {
  enabled: true,
  marketplace: "amazon.de",
  searchUrl: "https://www.amazon.de/s",
  trackingId: "figforge-21",
  oneLink: {
    enabled: true,
    sourceStoreId: "seitenhafen36-21",
    destinationStoreIds: {
      "amazon.com": "seitenhafen36-20",
    },
    redirectPreference: "close-match",
    checkedAt: "2026-10-13",
  },
};

export function validateAmazonAffiliateConfig(config: AmazonAffiliateConfig): void {
  if (
    !config.enabled
    || config.marketplace !== "amazon.de"
    || config.searchUrl !== "https://www.amazon.de/s"
    || !/^[a-z0-9-]+-21$/iu.test(config.trackingId)
  ) {
    throw new Error("Invalid Amazon.de affiliate configuration");
  }

  if (
    !config.oneLink.enabled
    || !/^[a-z0-9-]+-21$/iu.test(config.oneLink.sourceStoreId)
    || !/^[a-z0-9-]+-20$/iu.test(config.oneLink.destinationStoreIds["amazon.com"])
    || !new Set(["exact-match", "close-match"]).has(config.oneLink.redirectPreference)
    || !/^\d{4}-\d{2}-\d{2}$/.test(config.oneLink.checkedAt)
  ) {
    throw new Error("Invalid Amazon OneLink configuration record");
  }
}
