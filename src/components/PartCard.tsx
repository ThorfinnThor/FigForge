import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";
import { StatusMessage } from "./ui/StatusMessage.js";
import { evaluateCatalogPlacement } from "../compatibility/compatibility-evaluator.js";
import type { CatalogPackagePart } from "../contracts/catalog-package.js";
import { useI18n } from "../i18n.js";

type PartCardProps = {
  builderComponentId?: string | undefined;
  component: CatalogPackagePart;
  connectionStatus: "digitally-supported" | "blocked" | undefined;
  geometryOnlyPreview?: boolean;
  ldrawAvailable: boolean;
  onSelect: (() => void) | undefined;
  thumbnailUrl?: string | undefined;
  selected?: boolean;
};

export function PartCard({
  builderComponentId,
  component,
  connectionStatus,
  geometryOnlyPreview = false,
  ldrawAvailable,
  onSelect,
  selected = false,
  thumbnailUrl,
}: PartCardProps) {
  const { t } = useI18n();
  const targetSlot = component.role === "handAccessory" ? "leftHandAccessory" : component.role;
  const compatibility = builderComponentId
    ? evaluateCatalogPlacement(builderComponentId, targetSlot)
    : undefined;

  return (
    <Card
      className="part-card"
      data-role={component.role}
      selected={selected && connectionStatus === "digitally-supported"}
    >
      <span className="part-card__hang" aria-hidden="true" />
      <div className="part-card__band" aria-hidden="true" />
      <div className="part-card__image-wrap">
        {thumbnailUrl ? (
          <img className="part-card__image" src={thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <span className="part-card__no-preview" aria-label={t("part.noPreview")}>
            {t("part.noPreview")}
          </span>
        )}
      </div>
      <div className="part-card__body">
        <span
          className="part-card__badge"
          data-tone={connectionStatus === "digitally-supported"
            ? selected ? "active" : geometryOnlyPreview ? "geometry" : "connected"
            : "blocked"}
        >
          {connectionStatus === "digitally-supported"
            ? selected ? t("part.active") : geometryOnlyPreview ? t("part.geometry") : t("part.connected")
            : builderComponentId ? ldrawAvailable ? t("part.locked") : t("part.catalog")
              : t("part.catalogCsv")}
        </span>
        <h3 className="part-card__title">{component.name}</h3>
        <p className="part-card__id">Rebrickable · {component.rebrickablePartNum}</p>
        <StatusMessage className="part-card__status" tone="warning">
          {geometryOnlyPreview
            ? t("part.geometryStatus")
            : ldrawAvailable
            ? connectionStatus === "digitally-supported"
              ? t("part.connectedStatus")
              : t("part.profileMissing")
            : builderComponentId
              ? t("part.modelMissing")
              : t("part.catalogStatus")}
        </StatusMessage>
        {geometryOnlyPreview ? (
          <a
            aria-label={t("part.rebrickableLinkLabel", { name: component.name })}
            className="part-card__rebrickable-link"
            href={`https://rebrickable.com/parts/${encodeURIComponent(component.rebrickablePartNum)}/`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t("part.rebrickableLink")}
          </a>
        ) : null}
        <Button
          aria-pressed={connectionStatus === "digitally-supported" ? selected : undefined}
          className="part-card__action"
          disabled={connectionStatus !== "digitally-supported"}
          onClick={onSelect}
          title={connectionStatus === "digitally-supported"
            ? `${geometryOnlyPreview ? t("part.geometryTitle") : ""}${t("part.connectedTitle")}${compatibility?.message ?? ""}`
            : builderComponentId && ldrawAvailable
              ? t("part.profileMissingTitle")
              : builderComponentId
                ? t("part.modelMissingTitle")
                : t("part.catalogTitle")}
          variant="secondary"
          size="sm"
        >
          {connectionStatus === "digitally-supported"
            ? selected ? t("part.inserted") : t("part.insert")
            : builderComponentId && ldrawAvailable
              ? t("part.profileMissingButton")
              : builderComponentId ? t("part.modelMissingButton") : t("part.not3d")}
        </Button>
      </div>
    </Card>
  );
}
