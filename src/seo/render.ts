import type { Language } from "../i18n.js";
import { SEO_LANGUAGES, SEO_ROUTES, SITE_ORIGIN, canonicalUrl, routePath, type SeoRoute } from "./routes.js";

type Messages = Record<string, string>;

const escapeHtml = (value: string): string => value
  .replace(/&/gu, "&amp;")
  .replace(/</gu, "&lt;")
  .replace(/>/gu, "&gt;")
  .replace(/"/gu, "&quot;");

const requireMessage = (messages: Messages, key: string): string => {
  const value = messages[key];
  if (!value) throw new Error(`Missing German message for SEO key "${key}".`);
  return value;
};

/**
 * Fills the built index.html template with route-specific head tags and a
 * plain-text body. React replaces the #root contents as soon as it mounts, so
 * the body only has to serve crawlers and no-JavaScript readers.
 */
const OG_LOCALE: Record<Language, string> = { de: "de_DE", en: "en_US" };

export function renderRoutePage(
  template: string,
  route: SeoRoute,
  messages: Messages,
  language: Language = "de",
): string {
  const title = escapeHtml(requireMessage(messages, route.titleKey));
  const description = escapeHtml(requireMessage(messages, route.descriptionKey));
  const heading = escapeHtml(requireMessage(messages, route.headingKey));
  const lede = escapeHtml(requireMessage(messages, route.ledeKey));
  const url = escapeHtml(canonicalUrl(routePath(route, language)));
  const otherLanguage = SEO_LANGUAGES.find((candidate) => candidate !== language) ?? language;

  const headTags = [
    `<link rel="canonical" href="${url}" />`,
    ...(route.indexable ? alternateLinks(route) : ['<meta name="robots" content="noindex" />']),
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="FigForge" />',
    `<meta property="og:locale" content="${OG_LOCALE[language]}" />`,
    `<meta property="og:locale:alternate" content="${OG_LOCALE[otherLanguage]}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
  ].map((tag) => `    ${tag}`).join("\n");

  const withLang = replaceOnce(template, /<html lang="[a-z]+">/u, `<html lang="${language}">`);
  const withTitle = replaceOnce(withLang, /<title>[^<]*<\/title>/u, `<title>${title}</title>`);
  const withDescription = replaceOnce(
    withTitle,
    /<meta name="description" content="[^"]*" \/>/u,
    `<meta name="description" content="${description}" />`,
  );
  const withHead = replaceOnce(withDescription, /<\/head>/u, `${headTags}\n  </head>`);
  return replaceOnce(
    withHead,
    /<div id="root"><\/div>/u,
    `<div id="root"><main><h1>${heading}</h1><p>${lede}</p></main></div>`,
  );
}

/** hreflang pairs: every language version names all of them, and German is the default. */
const alternateLinks = (route: SeoRoute): string[] => [
  ...SEO_LANGUAGES.map((language) =>
    `<link rel="alternate" hreflang="${language}" href="${escapeHtml(canonicalUrl(routePath(route, language)))}" />`),
  `<link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl(routePath(route, "de")))}" />`,
];

function replaceOnce(source: string, pattern: RegExp, replacement: string): string {
  if (!pattern.test(source)) throw new Error(`index.html template is missing ${pattern}.`);
  return source.replace(pattern, () => replacement);
}

export const renderRobotsTxt = (): string => (
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`
);

export function renderSitemapXml(): string {
  const entries = SEO_ROUTES
    .filter((route) => route.indexable)
    .flatMap((route) => SEO_LANGUAGES.map((language) => {
      const alternates = [
        ...SEO_LANGUAGES.map((alternate) =>
          `    <xhtml:link rel="alternate" hreflang="${alternate}" href="${escapeHtml(canonicalUrl(routePath(route, alternate)))}"/>`),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl(routePath(route, "de")))}"/>`,
      ].join("\n");
      return `  <url>\n    <loc>${escapeHtml(canonicalUrl(routePath(route, language)))}</loc>\n${alternates}\n  </url>`;
    }))
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries}\n</urlset>\n`;
}
