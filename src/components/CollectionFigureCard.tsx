import type { SavedFigure } from "../storage/figure-draft-store.js";
import { builderComponentForId, thumbnailForComponent } from "./catalog-workspace-data.js";
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
    exportJson: string;
    onStage: string;
    partCount: string;
    savedAt: string;
  };
  onToggleStage: () => void;
  onMove: (direction: -1 | 1) => void;
  onExport: () => void;
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
  onExport,
}: CollectionFigureCardProps) {
  const thumbnails = saved.document.selections.flatMap(({ componentId, slot }) => {
    const component = builderComponentForId(componentId);
    return component ? [{ componentId, slot, src: thumbnailForComponent(component) }] : [];
  });

  return (
    <li className={`collection-card${onStage ? " collection-card--on-stage" : ""}`}>
      <div className="collection-card__visual" aria-hidden="true">
        {thumbnails.length > 0 ? (
          <div className={`collection-card__parts collection-card__parts--${Math.min(thumbnails.length, 5)}`}>
            {thumbnails.map(({ componentId, slot, src }) => (
              <img className={`collection-card__part collection-card__part--${slot}`} src={src} alt="" key={componentId} loading="lazy" />
            ))}
          </div>
        ) : (
          <span className="collection-card__monogram">{saved.document.name.slice(0, 1).toUpperCase()}</span>
        )}
        <span className="collection-card__part-count">{labels.partCount}</span>
        {onStage ? <span className="collection-card__stage-badge">✓ {labels.onStage}</span> : null}
      </div>

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
            {onStage ? labels.removeFromStage : labels.addToStage}
          </Button>
          <a className="ff-button ff-button--sm ff-button--ghost" href={`/?figureId=${encodeURIComponent(saved.id)}`}>
            {labels.openBuilder}
          </a>
          <Button onClick={onExport} size="sm" variant="ghost">
            ↓ {labels.exportJson}
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
