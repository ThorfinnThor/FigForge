import { useEffect } from "react";
import { guideIdFromPath, guidePath, type GuideSlugId } from "../app/routing.js";
import { GUIDE_IDS, GUIDE_SECTIONS } from "../guides/guide-content.js";
import { GUIDE_PRODUCTS } from "../guides/guide-products.js";
import { CURATED_PRODUCTS } from "../products/curated-products.js";
import { useI18n } from "../i18n.js";
import { AppHeader } from "./AppHeader.js";
import { CuratedProductGrid } from "./CuratedProductGrid.js";

export function GuidePage() {
  const { language, path, t } = useI18n();
  const id: GuideSlugId = guideIdFromPath(window.location.pathname) ?? "order";
  const sections = GUIDE_SECTIONS[id][language];
  const products = (GUIDE_PRODUCTS[id] ?? []).flatMap((productId) => CURATED_PRODUCTS.filter((product) => product.id === productId));
  // The next three guides in order, wrapping around, so the list stays short as guides are added.
  const position = GUIDE_IDS.indexOf(id);
  const others = [1, 2, 3].map((step) => GUIDE_IDS[(position + step) % GUIDE_IDS.length]!);

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
                {section.items
                  ? (section.ordered ? <ol>{section.items.map((item) => <li key={item}>{item}</li>)}</ol> : <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>)
                  : null}
                {section.closing?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}
          </div>
          {products.length > 0 ? (
            <section className="guide-page__products" aria-labelledby="guide-products-title">
              <p className="methodology-page__eyebrow">{t("guides.products.eyebrow")}</p>
              <h2 id="guide-products-title">{t("guides.products.title")}</h2>
              <p>{t("ideas.products.lede")}</p>
              <CuratedProductGrid placement={`guide-${id}`} products={products} />
            </section>
          ) : null}
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
