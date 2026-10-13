import { useEffect } from "react";
import { FIGURE_TEMPLATES, type FigureTemplateId } from "../ideas/figure-templates.js";
import { useI18n } from "../i18n.js";

const THEME_WORLDS = [
  { id: "pirate-captain", accent: "gold", nameKey: "ideas.world.pirates.name", descriptionKey: "ideas.world.pirates.description", rolesKey: "ideas.world.pirates.roles" },
  { id: "castle-knight", accent: "red", nameKey: "ideas.world.castle.name", descriptionKey: "ideas.world.castle.description", rolesKey: "ideas.world.castle.roles" },
  { id: "space-explorer", accent: "blue", nameKey: "ideas.world.space.name", descriptionKey: "ideas.world.space.description", rolesKey: "ideas.world.space.roles" },
  { id: "firefighter", accent: "green", nameKey: "ideas.world.fire.name", descriptionKey: "ideas.world.fire.description", rolesKey: "ideas.world.fire.roles" },
] as const satisfies ReadonlyArray<{
  id: FigureTemplateId;
  accent: "gold" | "red" | "blue" | "green";
  nameKey: string;
  descriptionKey: string;
  rolesKey: string;
}>;

const selectedThemeFromUrl = (): FigureTemplateId | null => {
  const value = new URLSearchParams(window.location.search).get("theme");
  return THEME_WORLDS.some((world) => world.id === value) ? value as FigureTemplateId : null;
};

export function IdeasPage() {
  const { language, setLanguage, t } = useI18n();
  const selectedTheme = selectedThemeFromUrl();
  const visibleTemplates = selectedTheme
    ? FIGURE_TEMPLATES.filter((template) => template.id === selectedTheme)
    : FIGURE_TEMPLATES;

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

        <section aria-labelledby="ideas-worlds-title">
          <div className="ideas-page__section-heading ideas-page__section-heading--worlds">
            <div>
              <p className="ideas-page__eyebrow">{t("ideas.worlds.eyebrow")}</p>
              <h2 id="ideas-worlds-title">{t("ideas.worlds.title")}</h2>
            </div>
            <p>{t("ideas.worlds.lede")}</p>
          </div>
          <ul className="ideas-worlds">
            <li className="ideas-worlds__all">
              <a
                aria-current={selectedTheme === null ? "page" : undefined}
                className="ff-button ff-button--ghost"
                href="/ideas"
              >
                {t("ideas.worlds.all")}
              </a>
            </li>
            {THEME_WORLDS.map((world) => (
              <li className="idea-world" data-accent={world.accent} key={world.id}>
                <div>
                  <h3>{t(world.nameKey)}</h3>
                  <p>{t(world.descriptionKey)}</p>
                  <p className="idea-world__roles">{t(world.rolesKey)}</p>
                </div>
                <a
                  aria-current={selectedTheme === world.id ? "page" : undefined}
                  className="idea-world__link"
                  href={`/ideas?theme=${encodeURIComponent(world.id)}`}
                >
                  {t("ideas.worlds.open")}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="ideas-grid-title">
          <div className="ideas-page__section-heading">
            <div>
              <p className="ideas-page__eyebrow">{t("ideas.starters.eyebrow")}</p>
              <h2 id="ideas-grid-title">{selectedTheme ? t("ideas.starters.filteredTitle") : t("ideas.starters.title")}</h2>
            </div>
            <p>{t("ideas.starters.hint")}</p>
          </div>
          <ul className="ideas-grid">
            {visibleTemplates.map((template) => (
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
