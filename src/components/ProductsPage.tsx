import { useEffect, useState } from "react";
import type { FigureThemeId } from "../ideas/figure-templates.js";
import { AppHeader } from "./AppHeader.js";
import { useI18n } from "../i18n.js";
import { CURATED_PRODUCTS } from "../products/curated-products.js";
import { CuratedProductGrid } from "./CuratedProductGrid.js";

type ProductCategory = "all" | FigureThemeId | "accessories";

const PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  "all",
  "pirates",
  "castle",
  "space",
  "fire-rescue",
  "accessories",
];

export function ProductsPage() {
  const { path, t } = useI18n();
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("all");
  const sets = CURATED_PRODUCTS.filter((product) => (
    product.type === "set"
    && (activeCategory === "all" || product.themeId === activeCategory)
  ));
  const accessories = CURATED_PRODUCTS.filter((product) => product.type === "accessory");
  const showSets = activeCategory !== "accessories";
  const showAccessories = activeCategory === "all" || activeCategory === "accessories";

  useEffect(() => {
    const previousTitle = document.title;
    document.title = t("products.metaTitle");
    return () => { document.title = previousTitle; };
  }, [t]);

  return (
    <div className="app-shell products-shell">
      <AppHeader active="sets" />

      <div className="products-page">
        <section className="products-hero" aria-labelledby="products-title">
          <p className="ideas-page__eyebrow">Create Your Minifig Picks · {t("products.adLabel")}</p>
          <h1 id="products-title">{t("products.title")}</h1>
          <p>{t("products.lede")}</p>
        </section>
        <nav className="products-filters" aria-label={t("products.filters.label")}>
          {PRODUCT_CATEGORIES.map((category) => (
            <button
              aria-pressed={activeCategory === category}
              className="products-filters__button"
              key={category}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {t(`products.filters.${category}`)}
            </button>
          ))}
        </nav>
        {showSets ? <section className="products-section" aria-labelledby="products-sets-title">
          <div className="products-section__heading">
            <div>
              <p className="ideas-page__eyebrow">{t("products.sets.eyebrow")}</p>
              <h2 id="products-sets-title">{t("products.sets.title")}</h2>
            </div>
            <p>{t("products.sets.lede")}</p>
          </div>
          <CuratedProductGrid placement="sets" products={sets} />
        </section> : null}
        {showAccessories ? <section className="products-section" aria-labelledby="products-accessories-title">
          <div className="products-section__heading">
            <div>
              <p className="ideas-page__eyebrow">{t("products.accessories.eyebrow")}</p>
              <h2 id="products-accessories-title">{t("products.accessories.title")}</h2>
            </div>
            <p>{t("products.accessories.lede")}</p>
          </div>
          <CuratedProductGrid placement="sets" products={accessories} />
        </section> : null}
        <footer className="products-legal">
          <p>{t("landing.legal")}</p>
          <a href={path("/privacy")}>{t("products.legalLink")}</a>
        </footer>
      </div>
    </div>
  );
}
