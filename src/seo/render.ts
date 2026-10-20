import { SEO_ROUTES, SITE_ORIGIN, canonicalUrl, type SeoRoute } from "./routes.js";

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
export function renderRoutePage(template: string, route: SeoRoute, messages: Messages): string {
  const title = escapeHtml(requireMessage(messages, route.titleKey));
  const description = escapeHtml(requireMessage(messages, route.descriptionKey));
  const heading = escapeHtml(requireMessage(messages, route.headingKey));
  const lede = escapeHtml(requireMessage(messages, route.ledeKey));
  const url = escapeHtml(canonicalUrl(route.path));

  const headTags = [
    `<link rel="canonical" href="${url}" />`,
    ...(route.indexable ? [] : ['<meta name="robots" content="noindex" />']),
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="FigForge" />',
    '<meta property="og:locale" content="de_DE" />',
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
  ].map((tag) => `    ${tag}`).join("\n");

  const withTitle = replaceOnce(template, /<title>[^<]*<\/title>/u, `<title>${title}</title>`);
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
    .map((route) => `  <url><loc>${escapeHtml(canonicalUrl(route.path))}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
