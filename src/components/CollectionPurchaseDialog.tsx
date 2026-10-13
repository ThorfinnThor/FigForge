import { useEffect, useId } from "react";
import type { SavedFigure } from "../storage/figure-draft-store.js";
import type { ShopExportSelection } from "../procurement/shop-export.js";
import { useI18n } from "../i18n.js";
import { builderComponentForId } from "./catalog-workspace-data.js";
import { ShopExportPanel } from "./ShopExportPanel.js";
import { Button } from "./ui/Button.js";

type CollectionPurchaseDialogProps = {
  exportError: boolean;
  onClose: () => void;
  onExportJson?: () => void;
  savedFigures: readonly SavedFigure[];
  title: string;
};

export const shopExportSelectionsForSavedFigures = (
  savedFigures: readonly SavedFigure[],
): ShopExportSelection[] => savedFigures.flatMap((saved) =>
  saved.document.selections.flatMap((selection) => {
    const component = builderComponentForId(selection.componentId);
    return component ? [{
      slot: selection.slot,
      name: component.name,
      rebrickablePartNum: component.rebrickablePartNum,
      sourceFigureId: saved.id,
      sourceFigureName: saved.document.name,
      ...(selection.rebrickableColorId === undefined
        ? {}
        : { rebrickableColorId: selection.rebrickableColorId }),
    } satisfies ShopExportSelection] : [];
  }));

export function CollectionPurchaseDialog({
  exportError,
  onClose,
  onExportJson,
  savedFigures,
  title,
}: CollectionPurchaseDialogProps) {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  const selections = shopExportSelectionsForSavedFigures(savedFigures);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="collection-purchase-dialog__backdrop">
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="collection-purchase-dialog"
        role="dialog"
      >
        <header className="collection-purchase-dialog__header">
          <div>
            <p className="collection-page__eyebrow">{t("collection.purchaseEyebrow")}</p>
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId}>{t("collection.purchaseDescription")}</p>
          </div>
          <Button autoFocus aria-label={t("collection.purchaseClose")} onClick={onClose} size="sm" variant="ghost">
            ×
          </Button>
        </header>

          <ShopExportPanel selections={selections} stepNumber={1} />

        {onExportJson ? (
          <details className="collection-purchase-dialog__backup">
            <summary>{t("collection.purchaseBackupTitle")}</summary>
            <p>{t("figure.transfer.default")}</p>
            {exportError ? <p className="collection-library__error" role="alert">{t("collection.exportError")}</p> : null}
            <Button onClick={onExportJson} size="sm" variant="ghost">
              ↓ {t("collection.exportJson")}
            </Button>
          </details>
        ) : null}
      </section>
    </div>
  );
}
