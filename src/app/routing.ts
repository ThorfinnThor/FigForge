import type { Language } from "../i18n.js";

/**
 * Public pages are identified by their German path, e.g. "/ideas/pirates". English pages live
 * under "/en" with the same path, except pages with translated slugs (see TRANSLATED_PATHS).
 */
export const EN_PREFIX = "/en";

/** German path to English path, for pages whose slug is translated. */
const TRANSLATED_PATHS: Readonly<Record<string, string>> = {};

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
  return TRANSLATED_PATHS[german] ?? (german === "/" ? `${EN_PREFIX}/` : `${EN_PREFIX}${german}`);
};

/** The same page in another language, keeping query and hash. */
export const switchLanguageUrl = (
  location: Pick<Location, "pathname" | "search" | "hash">,
  language: Language,
): string => `${localizedPath(germanPath(location.pathname), language)}${location.search}${location.hash}`;
