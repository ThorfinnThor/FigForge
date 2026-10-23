import { guidePath, localizedPath } from "../app/routing.js";
import { GUIDE_IDS } from "../guides/guide-content.js";
import { FIGURE_TEMPLATES, type FigureTemplate } from "../ideas/figure-templates.js";
import { partNumbers } from "../ideas/part-numbers.js";
import type { Language } from "../i18n.js";
import { CURATED_PRODUCTS, productsForThemePage, type CuratedProduct } from "../products/curated-products.js";
import { escapeHtml, requireMessage, type Messages } from "./html.js";

/** The theme worlds, by their German path id and their message-key stem. */
export const WORLDS = [
  { id: "pirates", key: "pirates" },
  { id: "castle", key: "castle" },
  { id: "space", key: "space" },
  { id: "fire-rescue", key: "fire" },
  { id: "zombies", key: "zombies" },
  { id: "fantasy", key: "fantasy" },
  { id: "vikings", key: "vikings" },
  { id: "egypt", key: "egypt" },
  { id: "monsters", key: "monsters" },
  { id: "wildwest", key: "wildwest" },
] as const;

export type WorldKey = (typeof WORLDS)[number]["key"];

type Context = { messages: Messages; language: Language };

const text = ({ messages }: Context, key: string): string => escapeHtml(requireMessage(messages, key));
const link = ({ language }: Context, path: string, label: string): string =>
  `<a href="${escapeHtml(localizedPath(path, language))}">${label}</a>`;

const templateList = (context: Context, templates: readonly FigureTemplate[], withParts: boolean): string => (
  `<ul>${templates.map((template) => {
    const parts = withParts
      ? `<dl>${partNumbers(template).map(({ slot, number }) =>
        `<dt>${text(context, `ideas.part.${slot}`)}</dt><dd>${escapeHtml(number)}</dd>`).join("")}</dl>`
      : "";
    return `<li><h3>${text(context, template.nameKey)}</h3><p>${text(context, template.descriptionKey)}</p>${parts}`
      + `<a href="${escapeHtml(localizedPath("/builder", context.language))}?template=${encodeURIComponent(template.id)}">${text(context, "ideas.customize")}</a></li>`;
  }).join("")}</ul>`
);

/** Product names and set numbers only: the affiliate links stay in the interactive page. */
const productList = (context: Context, products: readonly CuratedProduct[]): string => (
  `<ul>${products.map((product) => {
    const number = product.setNumber ?? product.productNumber;
    const official = product.officialUrl
      ? ` <a href="${escapeHtml(product.officialUrl)}" rel="noopener noreferrer">${text(context, "products.official")}</a>`
      : "";
    return `<li><h3>${text(context, product.titleKey)}${number ? ` (#${escapeHtml(number)})` : ""}</h3>`
      + `<p>${text(context, product.descriptionKey)}${official}</p></li>`;
  }).join("")}</ul>`
);

const worldList = (context: Context): string => (
  `<ul>${WORLDS.map(({ id, key }) =>
    `<li><h3>${text(context, `ideas.world.${key}.name`)}</h3><p>${text(context, `ideas.world.${key}.description`)}</p>`
    + `<p>${text(context, `ideas.world.${key}.roles`)}</p>${link(context, `/ideas/${id}`, text(context, "ideas.worlds.open"))}</li>`).join("")}</ul>`
);

export const landingBody = (context: Context): string => {
  const steps = (["pick", "check", "export"] as const).map((step) =>
    `<li><h3>${text(context, `landing.step.${step}.title`)}</h3><p>${text(context, `landing.step.${step}.body`)}</p></li>`).join("");
  const guides = GUIDE_IDS.map((id) =>
    `<li><a href="${escapeHtml(guidePath(id, context.language))}">${text(context, `guide.${id}.title`)}</a></li>`).join("");
  const facts = (["local", "shops", "independent"] as const).map((fact) =>
    `<li><h3>${text(context, `landing.fact.${fact}.title`)}</h3><p>${text(context, `landing.fact.${fact}.body`)}</p></li>`).join("");
  return `<p>${link(context, "/builder", text(context, "landing.cta.start"))} ${link(context, "/ideas", text(context, "landing.cta.ideas"))}</p>`
    + `<h2>${text(context, "landing.steps.title")}</h2><ol>${steps}</ol>`
    + `<h2>${text(context, "landing.worlds.title")}</h2><p>${text(context, "landing.worlds.lede")}</p>${worldList(context)}`
    + `<h2>${text(context, "landing.guides.title")}</h2><ul>${guides}</ul>`
    + `<h2>${text(context, "landing.facts.title")}</h2><ul>${facts}</ul>`
    + `<p>${text(context, "landing.legal")} ${link(context, "/impressum", text(context, "landing.imprintLink"))}</p>`;
};

const productsSection = (context: Context, products: readonly CuratedProduct[]): string => (
  `<h2>${text(context, "ideas.products.title")}</h2><p>${text(context, "ideas.products.eyebrow")}. ${text(context, "ideas.products.lede")}</p>`
  + `${productList(context, products)}<p>${link(context, "/sets", text(context, "ideas.products.all"))}</p>`
);

export const ideasBody = (context: Context): string => (
  `<h2>${text(context, "ideas.worlds.title")}</h2><p>${text(context, "ideas.worlds.lede")}</p>${worldList(context)}`
  + `<h2>${text(context, "ideas.starters.title")}</h2><p>${text(context, "ideas.starters.hint")}</p>`
  + templateList(context, FIGURE_TEMPLATES, false)
  + productsSection(context, productsForThemePage(null))
);

export const worldBody = (context: Context, id: (typeof WORLDS)[number]["id"], key: WorldKey): string => (
  `<p>${text(context, `ideas.world.${key}.roles`)}</p>`
  + `<h2>${text(context, "ideas.starters.filteredTitle")}</h2><p>${text(context, "ideas.starters.hint")}</p>`
  + templateList(context, FIGURE_TEMPLATES.filter((template) => template.themeId === id), true)
  + `<h2>${text(context, "ideas.tips.title")}</h2><p>${text(context, `ideas.world.${key}.tip`)}</p>`
  + productsSection(context, productsForThemePage(id))
  + `<p>${link(context, "/ideas", text(context, "ideas.worlds.all"))}</p>`
);

export const setsBody = (context: Context): string => (
  `<h2>${text(context, "products.sets.title")}</h2><p>${text(context, "products.sets.lede")}</p>`
  + productList(context, CURATED_PRODUCTS.filter((product) => product.type === "set"))
  + `<h2>${text(context, "products.accessories.title")}</h2><p>${text(context, "products.accessories.lede")}</p>`
  + productList(context, CURATED_PRODUCTS.filter((product) => product.type === "accessory"))
  + `<p>${text(context, "landing.legal")} ${link(context, "/privacy", text(context, "products.legalLink"))}</p>`
);

export const methodologyBody = (context: Context): string => (
  ["source.note", "methodology.assembly", "methodology.physical", "methodology.localStorage", "methodology.figureExport"]
    .map((key) => `<p>${text(context, key)}</p>`).join("")
  + "<ul>"
  + [
    ["/licenses/LDraw-CAreadme.txt", "source.ldrawLicense"],
    ["/licenses/LDCadShadowLibrary-NOTICE.txt", "source.connectionLicense"],
    ["/licenses/SemanticSearch-NOTICE.txt", "source.searchLicense"],
  ].map(([href, key]) => `<li><a href="${href}">${text(context, key!)}</a></li>`).join("")
  + "</ul>"
);

/** The builder is an app; its static text explains what it does and where to read more. */
export const builderBody = (context: Context): string => {
  const steps = (["pick", "check", "export"] as const).map((step) =>
    `<li><h3>${text(context, `landing.step.${step}.title`)}</h3><p>${text(context, `landing.step.${step}.body`)}</p></li>`).join("");
  const guides = GUIDE_IDS.map((id) =>
    `<li><a href="${escapeHtml(guidePath(id, context.language))}">${text(context, `guide.${id}.title`)}</a></li>`).join("");
  return `<h2>${text(context, "landing.steps.title")}</h2><ol>${steps}</ol>`
    + `<p>${link(context, "/ideas", text(context, "landing.cta.ideas"))}</p>`
    + `<h2>${text(context, "landing.guides.title")}</h2><ul>${guides}</ul>`
    + `<p>${link(context, "/methodology", text(context, "nav.notes"))}</p>`;
};
