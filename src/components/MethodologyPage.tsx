import { useI18n } from "../i18n.js";

export function MethodologyPage() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="app-shell methodology-shell">
      <header className="app-header">
        <a className="wordmark" href="/">Fig<span>Forge</span></a>
        <nav className="app-nav" aria-label={t("nav.label")}>
          <a className="app-nav__link" href="/">{t("nav.builder")}</a>
          <a className="app-nav__link" href="/collection">{t("nav.collection")}</a>
          <a className="app-nav__link app-nav__link--active" href="/methodology" aria-current="page">
            {t("nav.notes")}
          </a>
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
        <a className="methodology-page__back" href="/">← {t("methodology.back")}</a>
        <section className="workspace-methodology" aria-labelledby="methodology-title">
          <p className="methodology-page__eyebrow">FigForge</p>
          <h1 id="methodology-title">{t("methodology.title")}</h1>
          <div className="workspace-methodology__body">
            <p>{t("source.note")}</p>
            <p>{t("methodology.assembly")}</p>
            <p>{t("methodology.physical")}</p>
            <p className="workspace-methodology__links">
              <a href="/licenses/LDraw-CAreadme.txt" target="_blank" rel="noreferrer">{t("source.ldrawLicense")}</a>
              <a href="/licenses/LDCadShadowLibrary-NOTICE.txt" target="_blank" rel="noreferrer">{t("source.connectionLicense")}</a>
              <a href="/licenses/SemanticSearch-NOTICE.txt" target="_blank" rel="noreferrer">{t("source.searchLicense")}</a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
