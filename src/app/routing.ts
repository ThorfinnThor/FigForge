import type { Language } from "../i18n.js";

/**
 * Public pages are identified by their German path, e.g. "/ideas/pirates". English pages live
 * under "/en" with the same path, except pages with translated slugs (see TRANSLATED_PATHS).
 */
export const EN_PREFIX = "/en";

/** Guide slugs, German and English; the guides hub lives at /ratgeber and /en/guides. */
export const GUIDE_SLUGS = {
  order: { de: "minifiguren-teile-bestellen", en: "order-minifigure-parts" },
  "part-numbers": { de: "teilenummern-verstehen", en: "understand-part-numbers" },
  gift: { de: "minifigur-verschenken", en: "minifigure-gift" },
  anatomy: { de: "aufbau-einer-minifigur", en: "minifigure-anatomy" },
  bricklink: { de: "bricklink-wanted-list-minifigur", en: "bricklink-wanted-list-minifigure" },
  "pick-a-brick": { de: "pick-a-brick-minifiguren-teile", en: "pick-a-brick-minifigure-parts" },
  profession: { de: "minifigur-beruf-hobby", en: "minifigure-profession-hobby" },
  colors: { de: "farbnamen-und-farbnummern", en: "color-names-and-ids" },
  "kids-gift": { de: "minifigur-geschenk-fuer-kinder", en: "minifigure-gift-for-kids" },
  "build-with-kids": { de: "minifigur-mit-kindern-bauen", en: "build-a-minifigure-with-kids" },
  christmas: { de: "minifigur-weihnachtsgeschenk", en: "minifigure-christmas-gift" },
} as const;

export type GuideSlugId = keyof typeof GUIDE_SLUGS;

export const guidePath = (id: GuideSlugId, language: Language): string =>
  language === "de" ? `/ratgeber/${GUIDE_SLUGS[id].de}` : `${EN_PREFIX}/guides/${GUIDE_SLUGS[id].en}`;

/** German path to English path, for pages whose slug is translated. */
const TRANSLATED_PATHS: Readonly<Record<string, string>> = {
  "/impressum": `${EN_PREFIX}/imprint`,
  "/ratgeber": `${EN_PREFIX}/guides`,
  ...Object.fromEntries((Object.keys(GUIDE_SLUGS) as GuideSlugId[]).map((id) => [guidePath(id, "de"), guidePath(id, "en")])),
};

/** Which guide, if any, a path (in either language) belongs to. */
export const guideIdFromPath = (pathname: string): GuideSlugId | null => {
  const german = germanPath(pathname);
  return (Object.keys(GUIDE_SLUGS) as GuideSlugId[]).find((id) => guidePath(id, "de") === german) ?? null;
};

const ENGLISH_TO_GERMAN = new Map(Object.entries(TRANSLATED_PATHS).map(([german, english]) => [english, german]));

const trimTrailingSlash = (pathname: string): string => pathname.replace(/\/+$/u, "") || "/";

export const languageFromPath = (pathname: string): Language => {
  const path = trimTrailingSlash(pathname);
  return path === EN_PREFIX || path.startsWith(`${EN_PREFIX}/`) ? "en" : "de";
};

/** The page's German path, whichever language the given path is in. */
export const germanPath = (pathname: string): string => {
  const path = trimTrailingSlash(pathname);
  if (languageFromPath(path) === "de") return path;
  return ENGLISH_TO_GERMAN.get(path) ?? (path.slice(EN_PREFIX.length) || "/");
};

/** Path of a page (given by its German path) in the requested language. */
export const localizedPath = (path: string, language: Language): string => {
  const german = trimTrailingSlash(path);
  if (language === "de") return german;
  return TRANSLATED_PATHS[german] ?? (german === "/" ? EN_PREFIX : `${EN_PREFIX}${german}`);
};

/** The same page in another language, keeping query and hash. */
export const switchLanguageUrl = (
  location: Pick<Location, "pathname" | "search" | "hash">,
  language: Language,
): string => `${localizedPath(germanPath(location.pathname), language)}${location.search}${location.hash}`;
