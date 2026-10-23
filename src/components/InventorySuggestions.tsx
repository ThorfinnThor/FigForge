import { useMemo, useState } from "react";
import type { PartInventory } from "../contracts/part-inventory.js";
import { useI18n } from "../i18n.js";
import { FIGURE_TEMPLATES } from "../ideas/figure-templates.js";
import { matchTemplatesToInventory } from "../ideas/inventory-matches.js";

const INITIAL_SUGGESTION_COUNT = 6;

type InventorySuggestionsProps = { inventory: PartInventory };

export function InventorySuggestions({ inventory }: InventorySuggestionsProps) {
  const { path, t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const matches = useMemo(() => matchTemplatesToInventory(FIGURE_TEMPLATES, inventory), [inventory]);
  const visible = showAll ? matches : matches.slice(0, INITIAL_SUGGESTION_COUNT);

  return (
    <section className="inventory-suggestions" aria-labelledby="inventory-suggestions-title">
      <div>
        <p className="collection-page__eyebrow">{t("inventory.suggestions.eyebrow")}</p>
        <h2 id="inventory-suggestions-title">{t("inventory.suggestions.title")}</h2>
        <p>{t("inventory.suggestions.description")}</p>
      </div>
      {matches.length === 0 ? (
        <p className="inventory-suggestions__none" role="status">{t("inventory.suggestions.none")}</p>
      ) : (
        <ul className="inventory-suggestions__list">
          {visible.map(({ template, owned, missing }) => (
            <li className="inventory-suggestion" data-complete={missing.length === 0 ? "true" : undefined} key={template.id}>
              <img alt="" className="inventory-suggestion__preview" loading="lazy" src={template.previewImageUrl} />
              <div className="inventory-suggestion__body">
                <h3>{t(template.nameKey)}</h3>
                <p className="inventory-suggestion__count">
                  {missing.length === 0
                    ? t("inventory.suggestions.complete")
                    : t("inventory.suggestions.owned", { owned: owned.length, total: owned.length + missing.length })}
                </p>
                {missing.length > 0 ? (
                  <p className="inventory-suggestion__missing">
                    {t("inventory.suggestions.missing", {
                      parts: missing.map(({ slot, number }) => `${t(`ideas.part.${slot}`)} ${number}`).join(", "),
                    })}
                  </p>
                ) : null}
                <a
                  className="ff-button ff-button--secondary ff-button--sm"
                  href={`${path("/builder")}?template=${encodeURIComponent(template.id)}`}
                >
                  {t("inventory.suggestions.open")}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
      {matches.length > INITIAL_SUGGESTION_COUNT && !showAll ? (
        <button className="ff-button ff-button--ghost ff-button--sm" onClick={() => setShowAll(true)} type="button">
          {t("inventory.suggestions.showAll", { count: matches.length })}
        </button>
      ) : null}
    </section>
  );
}
