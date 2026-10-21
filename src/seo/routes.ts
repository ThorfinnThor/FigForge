import { guidePath, localizedPath } from "../app/routing.js";
import { GUIDE_IDS, type GuideId } from "../guides/guide-content.js";
import type { Language } from "../i18n.js";
import { WORLDS, type WorldKey } from "./page-bodies.js";

export const SITE_ORIGIN = "https://createyourminifig.com";
export const SEO_LANGUAGES = ["de", "en"] as const satisfies readonly Language[];

export type SeoRoute = {
  path: string;
  titleKey: string;
  descriptionKey: string;
  headingKey: string;
  ledeKey: string;
  indexable: boolean;
  /** Pages with text content get all of it in the prerendered HTML, not just the heading. */
  page?:
    | { kind: "guide"; id: GuideId }
    | { kind: "guides-hub" }
    | { kind: "imprint" }
    | { kind: "privacy" }
    | { kind: "landing" }
    | { kind: "ideas" }
    | { kind: "world"; id: (typeof WORLDS)[number]["id"]; key: WorldKey }
    | { kind: "sets" }
    | { kind: "methodology" };
};

export const SEO_ROUTES: readonly SeoRoute[] = [
  { path: "/", titleKey: "home.metaTitle", descriptionKey: "home.metaDescription", headingKey: "landing.title", ledeKey: "landing.lede", indexable: true, page: { kind: "landing" } },
  { path: "/builder", titleKey: "builder.metaTitle", descriptionKey: "builder.metaDescription", headingKey: "catalog.heading", ledeKey: "catalog.lede", indexable: true },
  { path: "/ideas", titleKey: "ideas.metaTitle", descriptionKey: "ideas.metaDescription", headingKey: "ideas.title", ledeKey: "ideas.lede", indexable: true, page: { kind: "ideas" } },
  ...WORLDS.map(({ id, key }): SeoRoute => ({
    path: `/ideas/${id}`,
    titleKey: `ideas.world.${key}.metaTitle`,
    descriptionKey: `ideas.world.${key}.metaDescription`,
    headingKey: `ideas.world.${key}.name`,
    ledeKey: `ideas.world.${key}.description`,
    indexable: true,
    page: { kind: "world", id, key },
  })),
  { path: "/sets", titleKey: "products.metaTitle", descriptionKey: "products.metaDescription", headingKey: "products.title", ledeKey: "products.lede", indexable: true, page: { kind: "sets" } },
  { path: "/methodology", titleKey: "methodology.metaTitle", descriptionKey: "methodology.metaDescription", headingKey: "methodology.title", ledeKey: "methodology.metaDescription", indexable: true, page: { kind: "methodology" } },
  { path: "/ratgeber", titleKey: "guides.metaTitle", descriptionKey: "guides.metaDescription", headingKey: "guides.title", ledeKey: "guides.lede", indexable: true, page: { kind: "guides-hub" } },
  ...GUIDE_IDS.map((id): SeoRoute => ({
    path: guidePath(id, "de"),
    titleKey: `guide.${id}.metaTitle`,
    descriptionKey: `guide.${id}.metaDescription`,
    headingKey: `guide.${id}.title`,
    ledeKey: `guide.${id}.lede`,
    indexable: true,
    page: { kind: "guide", id },
  })),
  { path: "/impressum", titleKey: "imprint.metaTitle", descriptionKey: "imprint.metaDescription", headingKey: "imprint.title", ledeKey: "imprint.lede", indexable: true, page: { kind: "imprint" } },
  { path: "/privacy", titleKey: "privacy.metaTitle", descriptionKey: "privacy.metaDescription", headingKey: "privacy.title", ledeKey: "privacy.metaDescription", indexable: true, page: { kind: "privacy" } },
  { path: "/collection", titleKey: "collection.metaTitle", descriptionKey: "builder.metaDescription", headingKey: "nav.collection", ledeKey: "builder.metaDescription", indexable: false },
];

/** Absolute URL of a path, which is already language-specific. */
export const canonicalUrl = (path: string): string => (
  path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`
);

/** Path of a route in a language; routes are identified by their German path. */
export const routePath = (route: Pick<SeoRoute, "path">, language: Language): string =>
  localizedPath(route.path, language);
