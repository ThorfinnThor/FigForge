export const SITE_ORIGIN = "https://createyourminifig.com";

export type SeoRoute = {
  path: string;
  titleKey: string;
  descriptionKey: string;
  headingKey: string;
  ledeKey: string;
  indexable: boolean;
};

const WORLD_KEYS = [
  { id: "pirates", key: "pirates" },
  { id: "castle", key: "castle" },
  { id: "space", key: "space" },
  { id: "fire-rescue", key: "fire" },
] as const;

export const SEO_ROUTES: readonly SeoRoute[] = [
  { path: "/", titleKey: "home.metaTitle", descriptionKey: "home.metaDescription", headingKey: "catalog.heading", ledeKey: "home.metaDescription", indexable: true },
  { path: "/ideas", titleKey: "ideas.metaTitle", descriptionKey: "ideas.metaDescription", headingKey: "ideas.title", ledeKey: "ideas.lede", indexable: true },
  ...WORLD_KEYS.map(({ id, key }): SeoRoute => ({
    path: `/ideas/${id}`,
    titleKey: `ideas.world.${key}.metaTitle`,
    descriptionKey: `ideas.world.${key}.metaDescription`,
    headingKey: `ideas.world.${key}.name`,
    ledeKey: `ideas.world.${key}.description`,
    indexable: true,
  })),
  { path: "/sets", titleKey: "products.metaTitle", descriptionKey: "products.metaDescription", headingKey: "products.title", ledeKey: "products.lede", indexable: true },
  { path: "/methodology", titleKey: "methodology.metaTitle", descriptionKey: "methodology.metaDescription", headingKey: "methodology.title", ledeKey: "methodology.metaDescription", indexable: true },
  { path: "/privacy", titleKey: "privacy.metaTitle", descriptionKey: "privacy.metaDescription", headingKey: "privacy.title", ledeKey: "privacy.metaDescription", indexable: true },
  { path: "/collection", titleKey: "collection.metaTitle", descriptionKey: "home.metaDescription", headingKey: "nav.collection", ledeKey: "home.metaDescription", indexable: false },
];

export const canonicalUrl = (path: string): string => (
  path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`
);
