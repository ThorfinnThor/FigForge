import refreshReport from "../../data/generated/catalog-refresh-report.json" with { type: "json" };
import type { Language } from "../i18n.js";

/** Minifigure parts in the catalog packages, as written by the last data refresh. */
export const CATALOG_PART_COUNT: number = refreshReport.packagedMinifigPartCount;

export const formatCatalogPartCount = (language: Language): string =>
  CATALOG_PART_COUNT.toLocaleString(language === "de" ? "de-DE" : "en-US");
