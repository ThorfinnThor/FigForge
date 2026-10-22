import { useEffect } from "react";
import { FIGURE_TEMPLATES, type FigureThemeId } from "../ideas/figure-templates.js";
import { partNumbers } from "../ideas/part-numbers.js";
import { AppHeader } from "./AppHeader.js";
import { germanPath } from "../app/routing.js";
import { useI18n } from "../i18n.js";
import { FigurePreviewCard } from "./FigurePreviewCard.js";
import { productsForThemePage } from "../products/curated-products.js";
import { CuratedProductGrid } from "./CuratedProductGrid.js";

const TIP_KEYS: Record<string, string> = {
  pirates: "ideas.world.pirates.tip",
  castle: "ideas.world.castle.tip",
  space: "ideas.world.space.tip",
  "fire-rescue": "ideas.world.fire.tip",
  zombies: "ideas.world.zombies.tip",
  fantasy: "ideas.world.fantasy.tip",
  vikings: "ideas.world.vikings.tip",
  egypt: "ideas.world.egypt.tip",
  monsters: "ideas.world.monsters.tip",
};

const THEME_WORLDS = [
  { id: "pirates", accent: "gold", nameKey: "ideas.world.pirates.name", descriptionKey: "ideas.world.pirates.description", rolesKey: "ideas.world.pirates.roles", metaTitleKey: "ideas.world.pirates.metaTitle", metaDescriptionKey: "ideas.world.pirates.metaDescription" },
  { id: "castle", accent: "red", nameKey: "ideas.world.castle.name", descriptionKey: "ideas.world.castle.description", rolesKey: "ideas.world.castle.roles", metaTitleKey: "ideas.world.castle.metaTitle", metaDescriptionKey: "ideas.world.castle.metaDescription" },
  { id: "space", accent: "blue", nameKey: "ideas.world.space.name", descriptionKey: "ideas.world.space.description", rolesKey: "ideas.world.space.roles", metaTitleKey: "ideas.world.space.metaTitle", metaDescriptionKey: "ideas.world.space.metaDescription" },
  { id: "fire-rescue", accent: "green", nameKey: "ideas.world.fire.name", descriptionKey: "ideas.world.fire.description", rolesKey: "ideas.world.fire.roles", metaTitleKey: "ideas.world.fire.metaTitle", metaDescriptionKey: "ideas.world.fire.metaDescription" },
  { id: "zombies", accent: "purple", nameKey: "ideas.world.zombies.name", descriptionKey: "ideas.world.zombies.description", rolesKey: "ideas.world.zombies.roles", metaTitleKey: "ideas.world.zombies.metaTitle", metaDescriptionKey: "ideas.world.zombies.metaDescription" },
  { id: "fantasy", accent: "teal", nameKey: "ideas.world.fantasy.name", descriptionKey: "ideas.world.fantasy.description", rolesKey: "ideas.world.fantasy.roles", metaTitleKey: "ideas.world.fantasy.metaTitle", metaDescriptionKey: "ideas.world.fantasy.metaDescription" },
  { id: "vikings", accent: "orange", nameKey: "ideas.world.vikings.name", descriptionKey: "ideas.world.vikings.description", rolesKey: "ideas.world.vikings.roles", metaTitleKey: "ideas.world.vikings.metaTitle", metaDescriptionKey: "ideas.world.vikings.metaDescription" },
  { id: "egypt", accent: "sand", nameKey: "ideas.world.egypt.name", descriptionKey: "ideas.world.egypt.description", rolesKey: "ideas.world.egypt.roles", metaTitleKey: "ideas.world.egypt.metaTitle", metaDescriptionKey: "ideas.world.egypt.metaDescription" },
  { id: "monsters", accent: "pink", nameKey: "ideas.world.monsters.name", descriptionKey: "ideas.world.monsters.description", rolesKey: "ideas.world.monsters.roles", metaTitleKey: "ideas.world.monsters.metaTitle", metaDescriptionKey: "ideas.world.monsters.metaDescription" },
] as const satisfies ReadonlyArray<{
  id: FigureThemeId;
  accent: "gold" | "red" | "blue" | "green" | "purple" | "teal" | "orange" | "sand" | "pink";
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
  const pathValue = germanPath(window.location.pathname).match(/^\/ideas\/([^/]+)\/?$/u)?.[1] ?? null;
  if (isThemeId(pathValue)) return pathValue;

  const queryValue = new URLSearchParams(window.location.search).get("theme");
  if (isThemeId(queryValue)) return queryValue;

  return FIGURE_TEMPLATES.find((template) => template.id === queryValue)?.themeId ?? null;
};

export function IdeasPage() {
  const { path, t } = useI18n();
  const selectedTheme = selectedThemeFromUrl();
  const selectedWorld = THEME_WORLDS.find((world) => world.id === selectedTheme);
  const visibleTemplates = selectedTheme
    ? FIGURE_TEMPLATES.filter((template) => template.themeId === selectedTheme)
    : FIGURE_TEMPLATES;
  const matchingProducts = productsForThemePage(selectedTheme);

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
      <AppHeader active="ideas" />

      <div className="ideas-page">
        <section className="ideas-hero" aria-labelledby="ideas-title">
          <p className="ideas-page__eyebrow">Create Your Minifig Ideas</p>
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
                <a className="ff-button ff-button--ghost ideas-page__all-worlds" href={path("/ideas")}>
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
                  href={path(`/ideas/${encodeURIComponent(world.id)}`)}
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
                <FigurePreviewCard
                  alt={t(template.nameKey)}
                  className="idea-card__preview"
                  src={template.previewImageUrl}
                />
                <div className="idea-card__body">
                  <h3>{t(template.nameKey)}</h3>
                  <p>{t(template.descriptionKey)}</p>
                  {selectedTheme ? (
                    <details className="idea-card__parts">
                      <summary>{t("ideas.parts.title")}</summary>
                      <dl>
                        {partNumbers(template).map(({ slot, number }) => (
                          <div key={slot}>
                            <dt>{t(`ideas.part.${slot}`)}</dt>
                            <dd>{number}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  ) : null}
                  <a className="ff-button ff-button--primary idea-card__cta" href={`${path("/builder")}?template=${encodeURIComponent(template.id)}`}>
                    {t("ideas.customize")}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {selectedTheme ? (
          <section className="ideas-section" aria-labelledby="ideas-tip-title">
            <div className="ideas-page__section-heading">
              <div>
                <p className="ideas-page__eyebrow">{t("ideas.tips.eyebrow")}</p>
                <h2 id="ideas-tip-title">{t("ideas.tips.title")}</h2>
              </div>
              <div className="ideas-page__section-aside">
                <p>{t(TIP_KEYS[selectedTheme] ?? "")}</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="ideas-section" aria-labelledby="ideas-products-title">
          <div className="ideas-page__section-heading">
            <div>
              <p className="ideas-page__eyebrow">{t("ideas.products.eyebrow")}</p>
              <h2 id="ideas-products-title">{t("ideas.products.title")}</h2>
            </div>
            <div className="ideas-page__section-aside">
              <p>{t("ideas.products.lede")}</p>
              <a className="ff-button ff-button--ghost ideas-page__all-worlds" href={path("/sets")}>
                {t("ideas.products.all")}
              </a>
            </div>
          </div>
          <CuratedProductGrid placement={selectedTheme ? `ideas-${selectedTheme}` : "ideas"} products={matchingProducts} />
        </section>
      </div>
    </div>
  );
}
