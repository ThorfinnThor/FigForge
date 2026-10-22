import { guidePath, localizedPath } from "../app/routing.js";
import { GUIDE_IDS, GUIDE_SECTIONS } from "../guides/guide-content.js";
import { splitInline } from "../privacy/inline.js";
import { privacySections } from "../privacy/privacy-content.js";
import type { Language } from "../i18n.js";
import { escapeHtml, requireMessage, type Messages } from "./html.js";
import { jsonLdFor, jsonLdScript } from "./json-ld.js";
import { builderBody, ideasBody, landingBody, methodologyBody, setsBody, worldBody } from "./page-bodies.js";
import { SEO_LANGUAGES, SEO_ROUTES, SITE_ORIGIN, canonicalUrl, ogImageUrl, routePath, type SeoRoute } from "./routes.js";

/**
 * Fills the built index.html template with route-specific head tags and a
 * plain-text body. React replaces the #root contents as soon as it mounts, so
 * the body only has to serve crawlers and no-JavaScript readers.
 */
const OG_LOCALE: Record<Language, string> = { de: "de_DE", en: "en_US" };

export type RenderOptions = {
  /** True when the site has a Google Analytics ID; selects the matching privacy wording. */
  analytics?: boolean;
  /** True while LEGO partner links are active; adds their paragraph to the privacy text. */
  legoAffiliate?: boolean;
};

export function renderRoutePage(
  template: string,
  route: SeoRoute,
  messages: Messages,
  language: Language = "de",
  options: RenderOptions = {},
): string {
  const title = escapeHtml(requireMessage(messages, route.titleKey));
  const description = escapeHtml(requireMessage(messages, route.descriptionKey));
  const heading = escapeHtml(requireMessage(messages, route.headingKey));
  const lede = escapeHtml(requireMessage(messages, route.ledeKey));
  const body = renderBody(route, messages, language, heading, lede, options);
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
    `<meta property="og:image" content="${escapeHtml(ogImageUrl(language))}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${escapeHtml(requireMessage(messages, "seo.ogImageAlt"))}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${escapeHtml(ogImageUrl(language))}" />`,
    ...(route.indexable ? [jsonLdScript(jsonLdFor(route, messages, language))] : []),
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
    `<div id="root">${body}</div>`,
  );
}

const list = (items: readonly string[], ordered: boolean): string =>
  ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`;

/** Pages ship their full text so search engines index the content, not just a title. */
function renderBody(
  route: SeoRoute,
  messages: Messages,
  language: Language,
  heading: string,
  lede: string,
  options: RenderOptions,
): string {
  const intro = `<h1>${heading}</h1><p>${lede}</p>`;
  const page = route.page;
  if (page?.kind === "guide") {
    const sections = GUIDE_SECTIONS[page.id][language].map((section) => [
      `<h2>${escapeHtml(section.heading)}</h2>`,
      ...(section.paragraphs ?? []).map((text) => `<p>${escapeHtml(text)}</p>`),
      section.items ? list(section.items.map((item) => `<li>${escapeHtml(item)}</li>`), section.ordered === true) : "",
      ...(section.closing ?? []).map((text) => `<p>${escapeHtml(text)}</p>`),
    ].join("")).join("");
    return `<main><article>${intro}${sections}</article></main>`;
  }
  if (page?.kind === "privacy") {
    const inline = (text: string): string => splitInline(text).map((part) => part.href === undefined
      ? escapeHtml(part.text)
      : `<a href="${escapeHtml(part.href.startsWith("/") ? localizedPath(part.href, language) : part.href)}">${escapeHtml(part.text)}</a>`).join("");
    const sections = privacySections(language, options.analytics === true, options.legoAffiliate === true).map((section) => [
      `<h2>${escapeHtml(section.heading)}</h2>`,
      ...(section.paragraphs ?? []).map((text) => `<p>${inline(text)}</p>`),
      section.items ? `<ul>${section.items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>` : "",
      ...(section.closing ?? []).map((text) => `<p>${inline(text)}</p>`),
    ].join("")).join("");
    return `<main><article>${intro}${sections}</article></main>`;
  }
  if (page?.kind === "imprint") {
    const text = (key: string): string => escapeHtml(requireMessage(messages, key));
    const address = (name: string): string =>
      `<address>${name}<br>${text("imprint.address.street")}<br>${text("imprint.address.city")}<br>${text("imprint.address.country")}</address>`;
    return `<main>${intro}`
      + `<h2>${text("imprint.provider.title")}</h2><p>${text("imprint.provider.name")}<br>${text("imprint.provider.legalForm")}<br>${text("imprint.provider.owner")}</p>${address("Schayan Yousefian")}`
      + `<h2>${text("imprint.contact.title")}</h2><p>${text("imprint.contact.email")} contact@createyourminifig.com</p>`
      + `<h2>${text("imprint.editorial.title")}</h2><p>${text("imprint.editorial.body")}</p>${address(text("imprint.editorial.name"))}`
      + `<h2>${text("imprint.trademark.title")}</h2>`
      + ["independent", "lego", "others", "sources"].map((part) => `<p>${text(`imprint.trademark.${part}`)}</p>`).join("")
      + "</main>";
  }
  if (page?.kind === "guides-hub") {
    const links = GUIDE_IDS.map((id) =>
      `<li><a href="${escapeHtml(guidePath(id, language))}">${escapeHtml(requireMessage(messages, `guide.${id}.title`))}</a></li>`).join("");
    return `<main>${intro}<ul>${links}</ul></main>`;
  }
  const context = { messages, language };
  if (page?.kind === "builder") return `<main>${intro}${builderBody(context)}</main>`;
  if (page?.kind === "landing") return `<main>${intro}${landingBody(context)}</main>`;
  if (page?.kind === "ideas") return `<main>${intro}${ideasBody(context)}</main>`;
  if (page?.kind === "world") return `<main>${intro}${worldBody(context, page.id, page.key)}</main>`;
  if (page?.kind === "sets") return `<main>${intro}${setsBody(context)}</main>`;
  if (page?.kind === "methodology") return `<main>${intro}${methodologyBody(context)}</main>`;
  return `<main>${intro}</main>`;
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

/**
 * The page Cloudflare serves with status 404 for unknown addresses ("404-page" in wrangler.jsonc).
 * It must not start the app, which would treat any unknown path as the builder, so the module
 * script is removed.
 */
export function render404Page(template: string, messages: Messages, language: Language): string {
  const title = escapeHtml(requireMessage(messages, "notFound.metaTitle"));
  const description = escapeHtml(requireMessage(messages, "notFound.metaDescription"));
  const link = (path: string, key: string, classes: string): string =>
    `<a class="${classes}" href="${escapeHtml(localizedPath(path, language))}">${escapeHtml(requireMessage(messages, key))}</a>`;
  const body = `<div class="app-shell ideas-shell"><main class="ideas-page"><section class="ideas-hero">`
    + `<h1>${escapeHtml(requireMessage(messages, "notFound.title"))}</h1>`
    + `<p>${escapeHtml(requireMessage(messages, "notFound.body"))}</p>`
    + `<div class="landing-page__actions">${link("/", "notFound.home", "ff-button ff-button--primary ff-button--lg")} `
    + `${link("/builder", "notFound.builder", "ff-button ff-button--ghost ff-button--lg landing-page__ghost")}</div>`
    + `</section></main></div>`;
  const withLang = replaceOnce(template, /<html lang="[a-z]+">/u, `<html lang="${language}">`);
  const withTitle = replaceOnce(withLang, /<title>[^<]*<\/title>/u, `<title>${title}</title>`);
  const withDescription = replaceOnce(
    withTitle,
    /<meta name="description" content="[^"]*" \/>/u,
    `<meta name="description" content="${description}" />`,
  );
  const withoutApp = replaceOnce(withDescription, /\s*<script type="module"[^>]*><\/script>/u, "");
  const withRobots = replaceOnce(withoutApp, /<\/head>/u, '    <meta name="robots" content="noindex" />\n  </head>');
  return replaceOnce(withRobots, /<div id="root"><\/div>/u, `<div id="root">${body}</div>`);
}

/** llms.txt: a short, plain description of the site for AI crawlers and assistants. */
export function renderLlmsTxt(messages: Record<Language, Messages>): string {
  const de = messages.de;
  const entry = (route: SeoRoute, language: Language): string => {
    const m = messages[language];
    return `- [${requireMessage(m, route.headingKey)}](${canonicalUrl(routePath(route, language))}): ${requireMessage(m, route.descriptionKey)}`;
  };
  const indexable = SEO_ROUTES.filter((route) => route.indexable);
  const section = (title: string, routes: readonly SeoRoute[], language: Language): string =>
    `## ${title}\n\n${routes.map((route) => entry(route, language)).join("\n")}\n`;
  const core = indexable.filter((route) => ["/", "/builder", "/ideas", "/sets", "/methodology"].includes(route.path));
  const guides = indexable.filter((route) => route.page?.kind === "guide" || route.page?.kind === "guides-hub");
  return [
    "# FigForge",
    "",
    `> ${requireMessage(de, "seo.webAppDescription")}`,
    "",
    "FigForge ist ein unabhängiges Projekt ohne Verbindung zur LEGO Gruppe. Teiledaten stammen aus den Rebrickable Catalog Downloads, 3D-Modelle aus der offiziellen LDraw-Bibliothek. Es gibt keine Konten; Entwürfe bleiben im Browser. FigForge verkauft keine Teile und nennt keine Preise.",
    "FigForge is an independent project with no connection to the LEGO Group. Part data comes from the Rebrickable catalog downloads, 3D models from the official LDraw library. There are no accounts; drafts stay in the browser. FigForge sells no parts and shows no prices.",
    "",
    section("Seiten", core, "de"),
    section("Ratgeber", guides, "de"),
    section("English", [...core, ...guides], "en"),
  ].join("\n");
}
