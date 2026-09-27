import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";
import { StatusMessage } from "./ui/StatusMessage.js";
import { evaluateCatalogPlacement } from "../compatibility/compatibility-evaluator.js";
import type { AssortmentComponent } from "../contracts/test-assortment.js";

type PartCardProps = {
  component: AssortmentComponent;
  connectionStatus: "digitally-supported" | "blocked" | undefined;
  ldrawAvailable: boolean;
  onSelect: (() => void) | undefined;
  thumbnailUrl: string;
  selected?: boolean;
};

export function PartCard({
  component,
  connectionStatus,
  ldrawAvailable,
  onSelect,
  selected = false,
  thumbnailUrl,
}: PartCardProps) {
  const targetSlot = component.role === "handAccessory" ? "leftHandAccessory" : component.role;
  const compatibility = evaluateCatalogPlacement(component.id, targetSlot);

  return (
    <Card className="part-card" selected={selected && connectionStatus === "digitally-supported"}>
      <div className="part-card__image-wrap">
        <img className="part-card__image" src={thumbnailUrl} alt="" loading="lazy" />
        <span className="part-card__badge">
          {connectionStatus === "digitally-supported" ? selected ? "Aktiv" : "Digital verbunden" : ldrawAvailable ? "Gesperrt" : "Katalog"}
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
            : "Kein belegtes offizielles LDraw-Modell · Auswahl gesperrt"}
        </StatusMessage>
        <Button
          aria-pressed={connectionStatus === "digitally-supported" ? selected : undefined}
          className="part-card__action"
          disabled={connectionStatus !== "digitally-supported"}
          onClick={onSelect}
          title={connectionStatus === "digitally-supported"
            ? `Digitales Anschlussprofil vorhanden. Physische Passform ist nicht garantiert. ${compatibility.message}`
            : ldrawAvailable
              ? "Für dieses offizielle LDraw-Modell fehlt ein belegtes digitales Anschlussprofil."
              : "Für dieses Katalogteil fehlt eine belegte offizielle LDraw-Zuordnung."}
          variant="secondary"
          size="sm"
        >
          {connectionStatus === "digitally-supported"
            ? selected ? "In Figur eingesetzt" : "In Figur einsetzen"
            : ldrawAvailable ? "Anschlussprofil fehlt" : "Kein offizielles LDraw-Modell"}
        </Button>
      </div>
    </Card>
  );
}
