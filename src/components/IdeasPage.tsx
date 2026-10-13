import { useEffect } from "react";
import { FIGURE_TEMPLATES } from "../ideas/figure-templates.js";
import { useI18n } from "../i18n.js";

export function IdeasPage() {
  const { language, setLanguage, t } = useI18n();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = t("ideas.metaTitle");
    return () => { document.title = previousTitle; };
  }, [t]);

  return (
    <div className="app-shell ideas-shell">
      <header className="app-header">
        <a className="wordmark" href="/">Fig<span>Forge</span></a>
        <nav className="app-nav" aria-label={t("nav.label")}>
          <a className="app-nav__link" href="/">{t("nav.builder")}</a>
          <a className="app-nav__link app-nav__link--active" href="/ideas" aria-current="page">{t("nav.ideas")}</a>
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

      <div className="ideas-page">
        <section className="ideas-hero" aria-labelledby="ideas-title">
          <p className="ideas-page__eyebrow">FigForge Ideas</p>
          <h1 id="ideas-title">{t("ideas.title")}</h1>
          <p>{t("ideas.lede")}</p>
        </section>

        <section aria-labelledby="ideas-grid-title">
          <div className="ideas-page__section-heading">
            <div>
              <p className="ideas-page__eyebrow">{t("ideas.sectionEyebrow")}</p>
              <h2 id="ideas-grid-title">{t("ideas.sectionTitle")}</h2>
            </div>
            <p>{t("ideas.sectionHint")}</p>
          </div>
          <ul className="ideas-grid">
            {FIGURE_TEMPLATES.map((template) => (
              <li className="idea-card" data-accent={template.accent} key={template.id}>
                <div className="idea-card__parts" aria-hidden="true">
                  {template.thumbnails.map((thumbnail, index) => (
                    <img alt="" key={thumbnail} loading="lazy" src={thumbnail} style={{ zIndex: index + 1 }} />
                  ))}
                </div>
                <div className="idea-card__body">
                  <p className="idea-card__number">{t("ideas.parts", { count: template.document.selections.length })}</p>
                  <h3>{t(template.nameKey)}</h3>
                  <p>{t(template.descriptionKey)}</p>
                  <a className="ff-button ff-button--primary idea-card__cta" href={`/?template=${encodeURIComponent(template.id)}`}>
                    {t("ideas.customize")}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
