import { useMemo } from "react";
import { useI18n } from "../i18n.js";
import { marketFromLanguages, type LegoMarket } from "../procurement/lego-affiliate.js";

/** The LEGO shop market for this visitor, from the browser language list (read locally only). */
export const useLegoMarket = (): LegoMarket | null => {
  const { language } = useI18n();
  return useMemo(() => {
    if (typeof navigator === "undefined") return marketFromLanguages([], language);
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
    return marketFromLanguages(languages, language);
  }, [language]);
};
