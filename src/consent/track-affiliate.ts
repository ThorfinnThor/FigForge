import { ANALYTICS_ENABLED, ANALYTICS_ID } from "./analytics-config.js";
import { sendAnalyticsEvent } from "./analytics.js";
import { browserAnalyticsEnvironment } from "./consent-runtime.js";

export type AffiliateClick = {
  partner: "amazon" | "lego";
  /** Where on the site the link sits, e.g. "sets", "guide-gift", "builder". */
  placement: string;
  /** The product or search the link leads to. */
  item: string;
  /** False for a plain link without a commission. */
  affiliate: boolean;
};

/** Counts a click on a partner link, only with consent and only when a measurement ID is set. */
export const trackAffiliateClick = (click: AffiliateClick): void => {
  if (!ANALYTICS_ENABLED || !ANALYTICS_ID) return;
  sendAnalyticsEvent(ANALYTICS_ID, "affiliate_click", { ...click }, browserAnalyticsEnvironment());
};
