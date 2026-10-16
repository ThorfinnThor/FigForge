import { useI18n } from "../i18n.js";
import { AMAZON_AFFILIATE_CONFIG } from "../procurement/amazon-config.js";
import { amazonProductLink, amazonSearchLink } from "../procurement/amazon-links.js";
import type { CuratedProduct } from "../products/curated-products.js";

type CuratedProductGridProps = {
  products: readonly CuratedProduct[];
};

export function CuratedProductGrid({ products }: CuratedProductGridProps) {
  const { t } = useI18n();

  return (
    <ul className="curated-products">
      {products.map((product) => {
        const amazonLink = product.amazonAsin
          ? amazonProductLink(product.amazonAsin, AMAZON_AFFILIATE_CONFIG.trackingId)
          : amazonSearchLink(
              product.amazonQuery,
              AMAZON_AFFILIATE_CONFIG.trackingId,
              AMAZON_AFFILIATE_CONFIG.searchUrl,
            );
        return (
          <li className="curated-product" data-accent={product.accent} key={product.id}>
            <div className="curated-product__visual" aria-hidden="true">
              <span>{product.setNumber ?? "◆"}</span>
            </div>
            <div className="curated-product__body">
              <p className="curated-product__type">
                {product.type === "set" ? t("products.type.set") : t("products.type.accessory")}
              </p>
              <h3>{t(product.titleKey)}</h3>
              <p>{t(product.descriptionKey)}</p>
              <div className="curated-product__actions">
                <a
                  className="ff-button ff-button--primary"
                  href={amazonLink.href}
                  rel="sponsored noopener noreferrer"
                  target="_blank"
                >
                  {t("products.amazon")}
                </a>
                {product.officialUrl ? (
                  <a
                    className="ff-button ff-button--ghost"
                    href={product.officialUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {t("products.official")}
                  </a>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
