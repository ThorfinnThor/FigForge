import { guidePath, localizedPath } from "../app/routing.js";
import { GUIDE_DATES } from "../guides/guide-content.js";
import type { Language } from "../i18n.js";
import { requireMessage, type Messages } from "./html.js";
import { SITE_ORIGIN, canonicalUrl, ogImageUrl, routePath, type SeoRoute } from "./routes.js";

type JsonLd = Record<string, unknown>;

const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

const organization = (): JsonLd => ({
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "FigForge",
  url: `${SITE_ORIGIN}/`,
  logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/icons/icon-512.png`, width: 512, height: 512 },
});

const website = (language: Language): JsonLd => ({
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  name: "FigForge",
  url: `${SITE_ORIGIN}/`,
  inLanguage: language,
  publisher: { "@id": ORGANIZATION_ID },
});

/** Home > section > page, from the page kind; the home page itself has no breadcrumb. */
const breadcrumb = (route: SeoRoute, messages: Messages, language: Language): JsonLd | null => {
  if (route.path === "/") return null;
  const heading = requireMessage(messages, route.headingKey);
  const parent = route.page?.kind === "guide"
    ? { path: "/ratgeber", name: requireMessage(messages, "guides.title") }
    : route.page?.kind === "world"
      ? { path: "/ideas", name: requireMessage(messages, "ideas.title") }
      : null;
  const trail = [
    { name: requireMessage(messages, "seo.breadcrumbHome"), url: canonicalUrl(localizedPath("/", language)) },
    ...(parent ? [{ name: parent.name, url: canonicalUrl(localizedPath(parent.path, language)) }] : []),
    { name: heading, url: canonicalUrl(routePath(route, language)) },
  ];
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};

const webApplication = (messages: Messages, language: Language): JsonLd => ({
  "@type": "WebApplication",
  "@id": `${SITE_ORIGIN}/#app`,
  name: requireMessage(messages, "seo.webAppName"),
  description: requireMessage(messages, "seo.webAppDescription"),
  url: canonicalUrl(localizedPath("/builder", language)),
  applicationCategory: "DesignApplication",
  operatingSystem: "Any (web browser)",
  inLanguage: language,
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  publisher: { "@id": ORGANIZATION_ID },
});

const article = (route: SeoRoute, messages: Messages, language: Language): JsonLd | null => {
  if (route.page?.kind !== "guide") return null;
  const dates = GUIDE_DATES[route.page.id];
  return {
    "@type": "Article",
    "@id": `${canonicalUrl(guidePath(route.page.id, language))}#article`,
    headline: requireMessage(messages, route.titleKey).replace(/ \| FigForge$/u, ""),
    description: requireMessage(messages, route.descriptionKey),
    inLanguage: language,
    datePublished: dates.published,
    dateModified: dates.modified,
    image: ogImageUrl(language),
    mainEntityOfPage: canonicalUrl(guidePath(route.page.id, language)),
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
  };
};

/** Structured data for a route as one JSON-LD graph. */
export function jsonLdFor(route: SeoRoute, messages: Messages, language: Language): JsonLd {
  const nodes = [
    website(language),
    ...(route.path === "/" ? [organization()] : []),
    ...(route.path === "/builder" ? [webApplication(messages, language), organization()] : []),
    breadcrumb(route, messages, language),
    article(route, messages, language),
    ...(route.page?.kind === "guide" ? [organization()] : []),
  ].filter((node): node is JsonLd => node !== null);
  return { "@context": "https://schema.org", "@graph": nodes };
}

/** `<` is escaped so that no text can close the script element. */
export const jsonLdScript = (data: JsonLd): string =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</gu, "\\u003c")}</script>`;
