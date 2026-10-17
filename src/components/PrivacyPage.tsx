import { useEffect } from "react";
import { AppHeader } from "./AppHeader.js";
import { useI18n } from "../i18n.js";

export function PrivacyPage() {
  const { t } = useI18n();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = t("privacy.metaTitle");
    return () => { document.title = previousTitle; };
  }, [t]);

  return (
    <div className="app-shell methodology-shell">
      <AppHeader active="privacy" />

      <div className="methodology-page">
        <a className="methodology-page__back" href="/sets">← {t("privacy.back")}</a>
        <section className="workspace-methodology" aria-labelledby="privacy-title">
          <p className="methodology-page__eyebrow">FigForge</p>
          <h1 id="privacy-title">{t("privacy.title")}</h1>
          <div className="workspace-methodology__body privacy-sections">
            <section>
              <h2>{t("privacy.local.title")}</h2>
              <p>{t("privacy.local.body")}</p>
            </section>
            <section>
              <h2>{t("privacy.links.title")}</h2>
              <p>{t("privacy.links.body")}</p>
            </section>
            <section>
              <h2>{t("privacy.affiliate.title")}</h2>
              <p>{t("amazon.disclosure")} {t("products.disclosure")}</p>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
