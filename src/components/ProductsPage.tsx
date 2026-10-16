import { useEffect } from "react";
import { useI18n } from "../i18n.js";
import { CURATED_PRODUCTS } from "../products/curated-products.js";
import { CuratedProductGrid } from "./CuratedProductGrid.js";

export function ProductsPage() {
  const { language, setLanguage, t } = useI18n();
  const sets = CURATED_PRODUCTS.filter((product) => product.type === "set");
  const accessories = CURATED_PRODUCTS.filter((product) => product.type === "accessory");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = t("products.metaTitle");
    return () => { document.title = previousTitle; };
  }, [t]);

  return (
    <div className="app-shell products-shell">
      <header className="app-header">
        <a className="wordmark" href="/">Fig<span>Forge</span></a>
        <nav className="app-nav" aria-label={t("nav.label")}>
          <a className="app-nav__link" href="/">{t("nav.builder")}</a>
          <a className="app-nav__link" href="/ideas">{t("nav.ideas")}</a>
          <a className="app-nav__link app-nav__link--active" href="/sets" aria-current="page">{t("nav.products")}</a>
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

      <div className="products-page">
        <section className="products-hero" aria-labelledby="products-title">
          <p className="ideas-page__eyebrow">FigForge Picks · {t("products.adLabel")}</p>
          <h1 id="products-title">{t("products.title")}</h1>
          <p>{t("products.lede")}</p>
        </section>
        <section className="products-section" aria-labelledby="products-sets-title">
          <div className="products-section__heading">
            <div>
              <p className="ideas-page__eyebrow">{t("products.sets.eyebrow")}</p>
              <h2 id="products-sets-title">{t("products.sets.title")}</h2>
            </div>
            <p>{t("products.sets.lede")}</p>
          </div>
          <CuratedProductGrid products={sets} />
        </section>
        <section className="products-section" aria-labelledby="products-accessories-title">
          <div className="products-section__heading">
            <div>
              <p className="ideas-page__eyebrow">{t("products.accessories.eyebrow")}</p>
              <h2 id="products-accessories-title">{t("products.accessories.title")}</h2>
            </div>
            <p>{t("products.accessories.lede")}</p>
          </div>
          <CuratedProductGrid products={accessories} />
        </section>
        <p className="products-disclosure">{t("amazon.disclosure")} {t("products.disclosure")}</p>
      </div>
    </div>
  );
}
