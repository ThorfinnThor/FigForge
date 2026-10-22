import { useI18n } from "../i18n.js";
import { trackAffiliateClick } from "../consent/track-affiliate.js";
import { AMAZON_AFFILIATE_CONFIG, amazonTrackingIdFor } from "../procurement/amazon-config.js";
import { amazonSearchLink } from "../procurement/amazon-links.js";

const PLACEMENT = "builder";

const recommendations = [
  { id: "displayCase", icon: "▣", query: "LEGO minifigure display case" },
  { id: "displayBase", icon: "◆", query: "LEGO minifigure display base plate" },
  { id: "storage", icon: "▤", query: "LEGO minifigure storage box" },
] as const;

export function AmazonRecommendations() {
  const { t } = useI18n();
  return (
    <aside className="amazon-recommendations" aria-labelledby="amazon-recommendations-title">
      <div>
        <p className="collection-page__eyebrow">{t("amazon.eyebrow")}</p>
        <h3 id="amazon-recommendations-title">{t("amazon.title")}</h3>
        <p>{t("amazon.description")}</p>
      </div>
      <div className="amazon-recommendations__grid">
        {recommendations.map(({ icon, id, query }) => {
          const link = amazonSearchLink(
            query,
            amazonTrackingIdFor(PLACEMENT),
            AMAZON_AFFILIATE_CONFIG.searchUrl,
          );
          return (
            <a
              className="amazon-recommendation"
              href={link.href}
              key={id}
              onClick={() => trackAffiliateClick({ partner: "amazon", placement: PLACEMENT, item: id, affiliate: link.affiliate })}
              rel="sponsored noopener noreferrer"
              target="_blank"
            >
              <span aria-hidden="true">{icon}</span>
              <strong>{t(`amazon.${id}.title`)}</strong>
              <small>{t("amazon.open")}</small>
            </a>
          );
        })}
      </div>
      <p className="amazon-recommendations__disclosure">{t("amazon.disclosure")}</p>
    </aside>
  );
}
