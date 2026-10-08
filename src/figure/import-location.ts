import { FIGURE_SHARE_LINK_PREFIX } from "./share-link.js";

/** Remove one-time figure import identifiers while preserving unrelated query parameters. */
export const consumedFigureImportPath = (currentUrl: string): string => {
  const url = new URL(currentUrl);
  url.searchParams.delete("figureId");
  if (url.hash.startsWith(`#${FIGURE_SHARE_LINK_PREFIX}=`)) {
    url.hash = "";
  }
  return `${url.pathname}${url.search}${url.hash}`;
};
