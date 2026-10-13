import { useI18n } from "../i18n.js";
import { amazonSearchLink } from "../procurement/amazon-links.js";

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
            import.meta.env.VITE_AMAZON_ASSOCIATE_TAG,
            import.meta.env.VITE_AMAZON_ASSOCIATE_SEARCH_URL,
          );
          return (
            <a
              className="amazon-recommendation"
              href={link.href}
              key={id}
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
