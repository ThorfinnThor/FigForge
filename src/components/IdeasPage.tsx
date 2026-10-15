import { useEffect } from "react";
import { FIGURE_TEMPLATES, type FigureThemeId } from "../ideas/figure-templates.js";
import { useI18n } from "../i18n.js";

const THEME_WORLDS = [
  { id: "pirates", accent: "gold", nameKey: "ideas.world.pirates.name", descriptionKey: "ideas.world.pirates.description", rolesKey: "ideas.world.pirates.roles", metaTitleKey: "ideas.world.pirates.metaTitle", metaDescriptionKey: "ideas.world.pirates.metaDescription" },
  { id: "castle", accent: "red", nameKey: "ideas.world.castle.name", descriptionKey: "ideas.world.castle.description", rolesKey: "ideas.world.castle.roles", metaTitleKey: "ideas.world.castle.metaTitle", metaDescriptionKey: "ideas.world.castle.metaDescription" },
  { id: "space", accent: "blue", nameKey: "ideas.world.space.name", descriptionKey: "ideas.world.space.description", rolesKey: "ideas.world.space.roles", metaTitleKey: "ideas.world.space.metaTitle", metaDescriptionKey: "ideas.world.space.metaDescription" },
  { id: "fire-rescue", accent: "green", nameKey: "ideas.world.fire.name", descriptionKey: "ideas.world.fire.description", rolesKey: "ideas.world.fire.roles", metaTitleKey: "ideas.world.fire.metaTitle", metaDescriptionKey: "ideas.world.fire.metaDescription" },
] as const satisfies ReadonlyArray<{
  id: FigureThemeId;
  accent: "gold" | "red" | "blue" | "green";
  nameKey: string;
  descriptionKey: string;
  rolesKey: string;
  metaTitleKey: string;
  metaDescriptionKey: string;
}>;

const isThemeId = (value: string | null): value is FigureThemeId => (
  THEME_WORLDS.some((world) => world.id === value)
);

const selectedThemeFromUrl = (): FigureThemeId | null => {
  const pathValue = window.location.pathname.match(/^\/ideas\/([^/]+)\/?$/u)?.[1] ?? null;
  if (isThemeId(pathValue)) return pathValue;

  const queryValue = new URLSearchParams(window.location.search).get("theme");
  if (isThemeId(queryValue)) return queryValue;

  return FIGURE_TEMPLATES.find((template) => template.id === queryValue)?.themeId ?? null;
};

export function IdeasPage() {
  const { language, setLanguage, t } = useI18n();
  const selectedTheme = selectedThemeFromUrl();
  const selectedWorld = THEME_WORLDS.find((world) => world.id === selectedTheme);
  const visibleTemplates = selectedTheme
    ? FIGURE_TEMPLATES.filter((template) => template.themeId === selectedTheme)
    : FIGURE_TEMPLATES;

  useEffect(() => {
    const previousTitle = document.title;
    const existingDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const description = existingDescription ?? document.createElement("meta");
    const previousDescription = existingDescription?.content;
    if (!existingDescription) {
      description.name = "description";
      document.head.append(description);
    }

    document.title = t(selectedWorld?.metaTitleKey ?? "ideas.metaTitle");
    description.content = t(selectedWorld?.metaDescriptionKey ?? "ideas.metaDescription");

    return () => {
      document.title = previousTitle;
      if (existingDescription) description.content = previousDescription ?? "";
      else description.remove();
    };
  }, [selectedWorld, t]);

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

        <section className="ideas-section" aria-labelledby="ideas-worlds-title">
          <div className="ideas-page__section-heading ideas-page__section-heading--worlds">
            <div>
              <p className="ideas-page__eyebrow">{t("ideas.worlds.eyebrow")}</p>
              <h2 id="ideas-worlds-title">{t("ideas.worlds.title")}</h2>
            </div>
            <div className="ideas-page__section-aside">
              <p>{t("ideas.worlds.lede")}</p>
              {selectedTheme ? (
                <a className="ff-button ff-button--ghost ideas-page__all-worlds" href="/ideas">
                  {t("ideas.worlds.all")}
                </a>
              ) : null}
            </div>
          </div>
          <ul className="ideas-worlds">
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
                  href={`/ideas/${encodeURIComponent(world.id)}`}
                >
                  {t("ideas.worlds.open")}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="ideas-section" aria-labelledby="ideas-grid-title">
          <div className="ideas-page__section-heading">
            <div>
              <p className="ideas-page__eyebrow">{t("ideas.starters.eyebrow")}</p>
              <h2 id="ideas-grid-title">{selectedWorld ? t(selectedWorld.nameKey) : t("ideas.starters.title")}</h2>
            </div>
            <p>{selectedWorld ? t(selectedWorld.descriptionKey) : t("ideas.starters.hint")}</p>
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
