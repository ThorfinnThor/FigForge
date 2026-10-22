import { guidePath } from "../app/routing.js";
import { GUIDE_IDS } from "../guides/guide-content.js";
import { FIGURE_TEMPLATES } from "../ideas/figure-templates.js";
import { useI18n } from "../i18n.js";
import { AppHeader } from "./AppHeader.js";
import { FigurePreviewCard } from "./FigurePreviewCard.js";

const WORLDS = [
  { id: "pirates", accent: "gold", key: "pirates" },
  { id: "castle", accent: "red", key: "castle" },
  { id: "space", accent: "blue", key: "space" },
  { id: "fire-rescue", accent: "green", key: "fire" },
  { id: "zombies", accent: "purple", key: "zombies" },
  { id: "fantasy", accent: "teal", key: "fantasy" },
  { id: "vikings", accent: "orange", key: "vikings" },
  { id: "egypt", accent: "sand", key: "egypt" },
  { id: "monsters", accent: "pink", key: "monsters" },
] as const;

const STEPS = ["pick", "check", "export"] as const;
const FACTS = ["local", "shops", "independent"] as const;

export function LandingPage() {
  const { language, path, t } = useI18n();

  return (
    <div className="app-shell ideas-shell">
      <AppHeader active="home" />

      <div className="ideas-page landing-page">
        <section className="ideas-hero" aria-labelledby="landing-title">
          <p className="ideas-page__eyebrow">{t("landing.eyebrow")}</p>
          <h1 id="landing-title">{t("landing.title")}</h1>
          <p>{t("landing.lede")}</p>
          <div className="landing-page__actions">
            <a className="ff-button ff-button--primary ff-button--lg" href={path("/builder")}>{t("landing.cta.start")}</a>
            <a className="ff-button ff-button--ghost ff-button--lg landing-page__ghost" href={path("/ideas")}>{t("landing.cta.ideas")}</a>
          </div>
        </section>

        <section className="ideas-section" aria-labelledby="landing-steps-title">
          <div className="ideas-page__section-heading">
            <div>
              <p className="ideas-page__eyebrow">{t("landing.steps.eyebrow")}</p>
              <h2 id="landing-steps-title">{t("landing.steps.title")}</h2>
            </div>
          </div>
          <ol className="landing-page__steps">
            {STEPS.map((step, index) => (
              <li className="idea-world landing-page__step" key={step}>
                <div>
                  <p className="idea-world__roles">{index + 1}</p>
                  <h3>{t(`landing.step.${step}.title`)}</h3>
                  <p>{t(`landing.step.${step}.body`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="ideas-section" aria-labelledby="landing-worlds-title">
          <div className="ideas-page__section-heading">
            <div>
              <p className="ideas-page__eyebrow">{t("ideas.worlds.eyebrow")}</p>
              <h2 id="landing-worlds-title">{t("landing.worlds.title")}</h2>
            </div>
            <div className="ideas-page__section-aside">
              <p>{t("landing.worlds.lede")}</p>
            </div>
          </div>
          <ul className="ideas-worlds">
            {WORLDS.map((world) => {
              const template = FIGURE_TEMPLATES.find((entry) => entry.themeId === world.id);
              return (
                <li className="idea-world" data-accent={world.accent} key={world.id}>
                  {template ? (
                    <FigurePreviewCard
                      alt={t(template.nameKey)}
                      className="idea-card__preview"
                      src={template.previewImageUrl}
                    />
                  ) : null}
                  <div>
                    <h3>{t(`ideas.world.${world.key}.name`)}</h3>
                    <p>{t(`ideas.world.${world.key}.description`)}</p>
                    <p className="idea-world__roles">{t(`ideas.world.${world.key}.roles`)}</p>
                  </div>
                  <a className="idea-world__link" href={path(`/ideas/${world.id}`)}>{t("ideas.worlds.open")}</a>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="ideas-section" aria-labelledby="landing-guides-title">
          <div className="ideas-page__section-heading">
            <div>
              <p className="ideas-page__eyebrow">{t("landing.guides.eyebrow")}</p>
              <h2 id="landing-guides-title">{t("landing.guides.title")}</h2>
            </div>
          </div>
          <ul className="landing-page__steps">
            {GUIDE_IDS.map((id) => (
              <li className="idea-world landing-page__step" key={id}>
                <div>
                  <h3>{t(`guide.${id}.title`)}</h3>
                </div>
                <a className="idea-world__link" href={guidePath(id, language)}>{t("guides.read")}</a>
              </li>
            ))}
          </ul>
        </section>

        <section className="ideas-section" aria-labelledby="landing-facts-title">
          <div className="ideas-page__section-heading">
            <div>
              <p className="ideas-page__eyebrow">{t("landing.facts.eyebrow")}</p>
              <h2 id="landing-facts-title">{t("landing.facts.title")}</h2>
            </div>
          </div>
          <ul className="landing-page__facts">
            {FACTS.map((fact) => (
              <li className="idea-world landing-page__fact" key={fact}>
                <div>
                  <h3>{t(`landing.fact.${fact}.title`)}</h3>
                  <p>{t(`landing.fact.${fact}.body`)}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="landing-page__legal">
            {t("landing.legal")} <a href={path("/impressum")}>{t("landing.imprintLink")}</a>
          </p>
        </section>
      </div>
    </div>
  );
}
