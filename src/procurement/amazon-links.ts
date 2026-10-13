export type AmazonLink = { href: string; affiliate: boolean };

const DEFAULT_SEARCH_URL = "https://www.amazon.de/s";
const ALLOWED_HOSTS = new Set(["amazon.de", "www.amazon.de", "amazon.com", "www.amazon.com"]);
const VALID_TAG = /^[a-z0-9-]{2,64}$/iu;

export const amazonSearchLink = (
  query: string,
  tag?: string,
  configuredBaseUrl?: string,
): AmazonLink => {
  let url: URL;
  try {
    url = new URL(configuredBaseUrl || DEFAULT_SEARCH_URL);
    if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname) || url.pathname !== "/s") {
      url = new URL(DEFAULT_SEARCH_URL);
    }
  } catch {
    url = new URL(DEFAULT_SEARCH_URL);
  }
  url.search = "";
  url.searchParams.set("k", query);
  const affiliate = Boolean(tag && VALID_TAG.test(tag));
  if (affiliate) url.searchParams.set("tag", tag!);
  return { href: url.href, affiliate };
};
