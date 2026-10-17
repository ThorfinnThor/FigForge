import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";
import { StatusMessage } from "./ui/StatusMessage.js";
import { evaluateCatalogPlacement } from "../compatibility/compatibility-evaluator.js";
import type { CatalogPackagePart } from "../contracts/catalog-package.js";
import { partDisplay } from "../catalog/part-display.js";
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

const compatibilityReasonMessageKey: Record<string, string> = {
  "attachment-unverified": "part.compatibility.attachmentUnverified",
  "fixture-only": "part.compatibility.fixtureOnly",
  "non-standard-body-system": "part.compatibility.nonStandardBodySystem",
  "single-slot-replacement": "part.compatibility.singleSlotReplacement",
  "unsupported-flexible-part": "part.compatibility.unsupportedFlexiblePart",
  "unverified-combination": "part.compatibility.unverifiedCombination",
  "unverified-neck-geometry": "part.compatibility.unverifiedNeckGeometry",
  "wrong-slot": "part.compatibility.wrongSlot",
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
  const display = partDisplay(component.name);
  const compatibilityMessage = compatibility
    ? t(compatibilityReasonMessageKey[compatibility.reasonCode]
      ?? "part.compatibility.unverifiedCombination")
    : "";

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
        {connectionStatus === "digitally-supported" && !selected && !geometryOnlyPreview ? null : (
          <span
            className="part-card__badge"
            data-tone={connectionStatus === "digitally-supported"
              ? selected ? "active" : "geometry"
              : "blocked"}
          >
            {connectionStatus === "digitally-supported"
              ? selected ? t("part.active") : t("part.geometry")
              : builderComponentId ? ldrawAvailable ? t("part.locked") : t("part.catalog")
                : t("part.catalog")}
          </span>
        )}
        <h3 className="part-card__title" lang="en" title={[component.name, ...display.notes].join(" · ")}>
          {display.title}
        </h3>
        <p className="part-card__id">
          {t("part.number", { num: component.rebrickablePartNum })}
          {display.plain ? ` · ${t("part.plain")}` : ""}
        </p>
        {geometryOnlyPreview || connectionStatus !== "digitally-supported" ? (
          <StatusMessage className="part-card__status" tone="warning">
            {geometryOnlyPreview
              ? t("part.geometryStatus")
              : ldrawAvailable
                ? t("part.profileMissing")
                : builderComponentId
                  ? t("part.modelMissing")
                  : t("part.catalogStatus")}
          </StatusMessage>
        ) : null}
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
            ? `${geometryOnlyPreview ? t("part.geometryTitle") : ""}${t("part.connectedTitle")}${compatibilityMessage}`
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
