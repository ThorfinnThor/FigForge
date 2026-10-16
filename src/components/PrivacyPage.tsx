import { useEffect } from "react";
import { useI18n } from "../i18n.js";

export function PrivacyPage() {
  const { language, setLanguage, t } = useI18n();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = t("privacy.metaTitle");
    return () => { document.title = previousTitle; };
  }, [t]);

  return (
    <div className="app-shell methodology-shell">
      <header className="app-header">
        <a className="wordmark" href="/">Fig<span>Forge</span></a>
        <nav className="app-nav" aria-label={t("nav.label")}>
          <a className="app-nav__link" href="/">{t("nav.builder")}</a>
          <a className="app-nav__link" href="/ideas">{t("nav.ideas")}</a>
          <a className="app-nav__link" href="/sets">{t("nav.products")}</a>
          <a className="app-nav__link" href="/collection">{t("nav.collection")}</a>
          <a className="app-nav__link" href="/methodology">{t("nav.notes")}</a>
        </nav>
        <span className="app-header__status">{t("header.status")}</span>
        <label className="language-picker">
          <span>{t("language.label")}</span>
          <select
            aria-label={t("language.label")}
            value={language}
            onChange={(event) => setLanguage(event.currentTarget.value as "de" | "en")}
          >
            <option value="de">{t("language.de")}</option>
            <option value="en">{t("language.en")}</option>
          </select>
        </label>
      </header>

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
