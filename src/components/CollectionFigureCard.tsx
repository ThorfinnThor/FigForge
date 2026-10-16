import type { SavedFigure } from "../storage/figure-draft-store.js";
import { FigurePreviewCard } from "./FigurePreviewCard.js";
import { Button } from "./ui/Button.js";

type CollectionFigureCardProps = {
  language: "de" | "en";
  saved: SavedFigure;
  onStage: boolean;
  stageIndex: number;
  stageSize: number;
  stageFull: boolean;
  busy: boolean;
  labels: {
    addToStage: string;
    removeFromStage: string;
    moveUp: string;
    moveDown: string;
    openBuilder: string;
    buyFigure: string;
    stageFull: string;
    onStage: string;
    savedAt: string;
  };
  onToggleStage: () => void;
  onMove: (direction: -1 | 1) => void;
  onBuy: () => void;
};

export function CollectionFigureCard({
  language,
  saved,
  onStage,
  stageIndex,
  stageSize,
  stageFull,
  busy,
  labels,
  onToggleStage,
  onMove,
  onBuy,
}: CollectionFigureCardProps) {
  return (
    <li className={`collection-card${onStage ? " collection-card--on-stage" : ""}`}>
      <FigurePreviewCard
        alt={saved.document.name}
        className="collection-card__visual"
        src={saved.previewImageDataUrl}
      >
        {!saved.previewImageDataUrl ? (
          <span className="collection-card__monogram">{saved.document.name.slice(0, 1).toUpperCase()}</span>
        ) : null}
        {onStage ? <span className="collection-card__stage-badge">✓ {labels.onStage}</span> : null}
      </FigurePreviewCard>

      <div className="collection-card__body">
        <div className="collection-card__copy">
          <h4>{saved.document.name}</h4>
          <p>{labels.savedAt} · {new Date(saved.updatedAt).toLocaleDateString(language)}</p>
        </div>
        <div className="collection-card__actions">
          <Button
            aria-pressed={onStage}
            disabled={busy || (!onStage && stageFull)}
            onClick={onToggleStage}
            size="sm"
            variant={onStage ? "secondary" : "primary"}
          >
            {onStage ? labels.removeFromStage : stageFull ? labels.stageFull : labels.addToStage}
          </Button>
          <a className="ff-button ff-button--sm ff-button--ghost" href={`/?figureId=${encodeURIComponent(saved.id)}`}>
            {labels.openBuilder}
          </a>
          <Button onClick={onBuy} size="sm" variant="primary">
            {labels.buyFigure}
          </Button>
        </div>
        {onStage ? (
          <div className="collection-card__order" aria-label={labels.onStage}>
            <Button aria-label={labels.moveUp} disabled={busy || stageIndex <= 0} onClick={() => onMove(-1)} size="sm" variant="ghost">←</Button>
            <span>{stageIndex + 1} / {stageSize}</span>
            <Button aria-label={labels.moveDown} disabled={busy || stageIndex >= stageSize - 1} onClick={() => onMove(1)} size="sm" variant="ghost">→</Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
