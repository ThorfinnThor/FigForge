import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";
import { StatusMessage } from "./ui/StatusMessage.js";
import { evaluateCatalogPlacement } from "../compatibility/compatibility-evaluator.js";
import type { CatalogPackagePart } from "../contracts/catalog-package.js";

type PartCardProps = {
  builderComponentId?: string | undefined;
  component: CatalogPackagePart;
  connectionStatus: "digitally-supported" | "blocked" | undefined;
  ldrawAvailable: boolean;
  onSelect: (() => void) | undefined;
  thumbnailUrl?: string | undefined;
  selected?: boolean;
};

export function PartCard({
  builderComponentId,
  component,
  connectionStatus,
  ldrawAvailable,
  onSelect,
  selected = false,
  thumbnailUrl,
}: PartCardProps) {
  const targetSlot = component.role === "handAccessory" ? "leftHandAccessory" : component.role;
  const compatibility = builderComponentId
    ? evaluateCatalogPlacement(builderComponentId, targetSlot)
    : undefined;

  return (
    <Card className="part-card" selected={selected && connectionStatus === "digitally-supported"}>
      <div className="part-card__image-wrap">
        {thumbnailUrl ? (
          <img className="part-card__image" src={thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <span className="part-card__no-preview" aria-label="Keine Bildvorschau verfügbar">
            Keine Bildvorschau
          </span>
        )}
        <span className="part-card__badge">
          {connectionStatus === "digitally-supported"
            ? selected ? "Aktiv" : "Digital verbunden"
            : builderComponentId ? ldrawAvailable ? "Gesperrt" : "Katalog"
              : "Catalog CSV"}
        </span>
      </div>
      <div className="part-card__body">
        <h3 className="part-card__title">{component.name}</h3>
        <p className="part-card__id">Rebrickable · {component.rebrickablePartNum}</p>
        <StatusMessage className="part-card__status" tone="warning">
          {ldrawAvailable
            ? connectionStatus === "digitally-supported"
              ? "LDraw-Modell und versioniertes digitales Anschlussprofil vorhanden"
              : "Kein belegtes digitales Anschlussprofil · Auswahl gesperrt"
            : builderComponentId
              ? "Kein belegtes offizielles LDraw-Modell · Auswahl gesperrt"
              : "Rebrickable-Katalogeintrag · noch ohne geprüftes 3D-Modell"}
        </StatusMessage>
        <Button
          aria-pressed={connectionStatus === "digitally-supported" ? selected : undefined}
          className="part-card__action"
          disabled={connectionStatus !== "digitally-supported"}
          onClick={onSelect}
          title={connectionStatus === "digitally-supported"
            ? `Digitales Anschlussprofil vorhanden. Physische Passform ist nicht garantiert. ${compatibility?.message ?? ""}`
            : builderComponentId && ldrawAvailable
              ? "Für dieses offizielle LDraw-Modell fehlt ein belegtes digitales Anschlussprofil."
              : builderComponentId
                ? "Für dieses Katalogteil fehlt eine belegte offizielle LDraw-Zuordnung."
                : "Dieser Eintrag stammt aus den Rebrickable Catalog Downloads/CSV; 3D-Modell und Anschlussprofil sind noch nicht geprüft."}
          variant="secondary"
          size="sm"
        >
          {connectionStatus === "digitally-supported"
            ? selected ? "In Figur eingesetzt" : "In Figur einsetzen"
            : builderComponentId && ldrawAvailable
              ? "Anschlussprofil fehlt"
              : builderComponentId ? "Kein offizielles LDraw-Modell" : "Noch nicht 3D-fähig"}
        </Button>
      </div>
    </Card>
  );
}
