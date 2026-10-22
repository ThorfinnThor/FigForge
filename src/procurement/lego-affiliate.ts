/**
 * LEGO partner links (Rakuten Advertising). There is no server, so the market is chosen from the
 * browser's language list, which is only read on the visitor's device. A German browser setting
 * with an English page still gets the German shop; a visitor whose setting we do not know gets the
 * plain link without a commission.
 */
export type LegoRegion = "eu" | "uk";

export type LegoMarket = {
  /** Shop path segment on lego.com, e.g. "de-de". */
  locale: string;
  /** The affiliate program that covers this shop, or null while there is none. */
  region: LegoRegion | null;
};

/**
 * Deep-link templates from the Rakuten Link Builder, one per approved program. `{url}` stands for
 * the URL-encoded LEGO product address. Leave a program `null` until it is approved: its visitors
 * then get the plain link, and the privacy notice does not mention affiliate links.
 */
export const LEGO_AFFILIATE_TEMPLATES: Readonly<Record<LegoRegion, string | null>> = {
  eu: null,
  uk: null,
};

/**
 * Countries by the region part of a browser language such as "de-AT". The shop locales were
 * checked to exist; the programs that cover each country must be read from the Rakuten program
 * terms before a country gets a region. Countries without a region only get the matching shop.
 */
const MARKETS: Readonly<Record<string, LegoMarket>> = {
  DE: { locale: "de-de", region: "eu" },
  AT: { locale: "de-at", region: "eu" },
  CH: { locale: "de-ch", region: null },
  FR: { locale: "fr-fr", region: null },
  GB: { locale: "en-gb", region: "uk" },
  US: { locale: "en-us", region: null },
};

const GERMAN_DEFAULT: LegoMarket = MARKETS.DE!;
const ALLOWED_HOST = "click.linksynergy.com";

export const isValidAffiliateTemplate = (template: string | null): template is string => {
  if (!template || template.split("{url}").length !== 2) return false;
  try {
    const url = new URL(template.replace("{url}", "x"));
    return url.protocol === "https:" && url.hostname === ALLOWED_HOST;
  } catch {
    return false;
  }
};

export const isLegoAffiliateActive = (
  templates: Readonly<Record<LegoRegion, string | null>> = LEGO_AFFILIATE_TEMPLATES,
): boolean => Object.values(templates).some(isValidAffiliateTemplate);

/** Language tags look like "en-GB", "de", or "zh-Hans-CN"; the country is the last two-letter part. */
const countryOf = (tag: string): string | null => {
  const parts = tag.split("-");
  const last = parts.length > 1 ? parts[parts.length - 1]! : "";
  return /^[A-Za-z]{2}$/u.test(last) ? last.toUpperCase() : null;
};

/**
 * The market for the first browser language that names a known country. Without one, a German
 * page falls back to the German shop; otherwise there is no market and the link stays as it is.
 */
export const marketFromLanguages = (
  languages: readonly string[],
  siteLanguage: "de" | "en",
): LegoMarket | null => {
  for (const tag of languages) {
    const country = countryOf(tag);
    const market = country ? MARKETS[country] : undefined;
    if (market) return market;
  }
  return siteLanguage === "de" ? GERMAN_DEFAULT : null;
};

export type LegoLink = { href: string; affiliate: boolean };

export const legoProductLink = (
  url: string,
  market: LegoMarket | null,
  templates: Readonly<Record<LegoRegion, string | null>> = LEGO_AFFILIATE_TEMPLATES,
): LegoLink => {
  const parts = /^(https:\/\/www\.lego\.com\/)[a-z]{2}-[a-z]{2}(\/.+)$/u.exec(url);
  if (!market || !parts) return { href: url, affiliate: false };
  const target = `${parts[1]}${market.locale}${parts[2]}`;
  const template = market.region ? templates[market.region] : null;
  if (!isValidAffiliateTemplate(template)) return { href: target, affiliate: false };
  return { href: template.replace("{url}", encodeURIComponent(target)), affiliate: true };
};
