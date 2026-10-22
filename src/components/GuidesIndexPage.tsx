import { useEffect } from "react";
import { guidePath } from "../app/routing.js";
import { GUIDE_IDS } from "../guides/guide-content.js";
import { useI18n } from "../i18n.js";
import { AppHeader } from "./AppHeader.js";

export function GuidesIndexPage() {
  const { language, t } = useI18n();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = t("guides.metaTitle");
    return () => { document.title = previousTitle; };
  }, [t]);

  return (
    <div className="app-shell ideas-shell">
      <AppHeader active="guides" />

      <div className="ideas-page">
        <section className="ideas-hero" aria-labelledby="guides-title">
          <p className="ideas-page__eyebrow">Create Your Minifig</p>
          <h1 id="guides-title">{t("guides.title")}</h1>
          <p>{t("guides.lede")}</p>
        </section>

        <ul className="ideas-worlds guides-list">
          {GUIDE_IDS.map((id) => (
            <li className="idea-world" key={id}>
              <div>
                <h3>{t(`guide.${id}.title`)}</h3>
                <p>{t(`guide.${id}.lede`)}</p>
              </div>
              <a className="idea-world__link" href={guidePath(id, language)}>{t("guides.read")}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
