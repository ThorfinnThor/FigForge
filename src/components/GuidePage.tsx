import { useEffect } from "react";
import { guideIdFromPath, guidePath, type GuideSlugId } from "../app/routing.js";
import { GUIDE_IDS, GUIDE_SECTIONS } from "../guides/guide-content.js";
import { useI18n } from "../i18n.js";
import { AppHeader } from "./AppHeader.js";

export function GuidePage() {
  const { language, path, t } = useI18n();
  const id: GuideSlugId = guideIdFromPath(window.location.pathname) ?? "order";
  const sections = GUIDE_SECTIONS[id][language];
  const others = GUIDE_IDS.filter((guide) => guide !== id);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = t(`guide.${id}.metaTitle`);
    return () => { document.title = previousTitle; };
  }, [id, t]);

  return (
    <div className="app-shell methodology-shell">
      <AppHeader active="guides" />

      <div className="methodology-page guide-page">
        <a className="methodology-page__back" href={path("/ratgeber")}>← {t("guides.title")}</a>
        <article className="workspace-methodology" aria-labelledby="guide-title">
          <p className="methodology-page__eyebrow">{t("guides.title")}</p>
          <h1 id="guide-title">{t(`guide.${id}.title`)}</h1>
          <p className="guide-page__lede">{t(`guide.${id}.lede`)}</p>
          <div className="workspace-methodology__body guide-page__body">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.items ? <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                {section.closing?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}
          </div>
          <nav className="guide-page__more" aria-label={t("guides.related")}>
            <h2>{t("guides.related")}</h2>
            <ul>
              {others.map((guide) => (
                <li key={guide}><a href={guidePath(guide, language)}>{t(`guide.${guide}.title`)}</a></li>
              ))}
            </ul>
            <a className="ff-button ff-button--primary" href={path("/builder")}>{t("guides.cta")}</a>
          </nav>
        </article>
      </div>
    </div>
  );
}
