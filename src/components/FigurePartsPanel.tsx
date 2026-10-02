import { Card } from "./ui/Card.js";
import { Button } from "./ui/Button.js";
import { StatusMessage } from "./ui/StatusMessage.js";
import type { CatalogPackagePart } from "../contracts/catalog-package.js";
import type { SavedFigure } from "../storage/figure-draft-store.js";
import { useRef, type RefObject } from "react";
import { useI18n } from "../i18n.js";

type FigureSlot = {
  id: string;
  label: string;
  component: CatalogPackagePart | undefined;
  thumbnailUrl?: string | undefined;
};

type FigurePartsPanelProps = {
  closeButtonRef?: RefObject<HTMLButtonElement | null>;
  drawer?: boolean;
  onClose?: () => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onSaveToCollection: () => Promise<void>;
  onLoadFromCollection: (saved: SavedFigure) => Promise<void>;
  onDeleteFromCollection: (id: string) => Promise<void>;
  onClearLocalData: () => Promise<void>;
  saveStatus: "loading" | "saved" | "error";
  savedFigures: readonly SavedFigure[];
  transferMessage: string | null;
  slots: readonly FigureSlot[];
};

export function FigurePartsPanel({
  closeButtonRef,
  drawer = false,
  onClose,
  onExport,
  onImport,
  onSaveToCollection,
  onLoadFromCollection,
  onDeleteFromCollection,
  onClearLocalData,
  saveStatus,
  savedFigures,
  slots,
  transferMessage,
}: FigurePartsPanelProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  return (
    <aside className={["figure-panel", drawer ? "figure-panel--drawer" : ""].filter(Boolean).join(" ")} id="figure-panel" aria-labelledby="figure-panel-heading">
      <span className="figure-panel__hang" aria-hidden="true" />
      <div className="figure-panel__header">
        <div>
          <p className="eyebrow">{t("figure.eyebrow")}</p>
          <h2 id="figure-panel-heading">{t("figure.title")}</h2>
        </div>
        <div className="figure-panel__header-actions">
          <span className="figure-panel__count">{t("figure.slots", { count: slots.length })}</span>
          {drawer ? (
            <button
              aria-label={t("figure.panelClose")}
              className="figure-panel__close"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              {t("figure.close")}
            </button>
          ) : null}
        </div>
      </div>
      <div className="figure-slot-list">
        {slots.map((slot) => (
          <Card className="figure-slot" data-role={slot.id} data-filled={slot.component ? "true" : undefined} key={slot.id}>
            <span className="figure-slot__bar" aria-hidden="true" />
            <div className="figure-slot__thumb" aria-hidden="true">
              {slot.component && slot.thumbnailUrl ? <img alt="" src={slot.thumbnailUrl} /> : null}
            </div>
            <div className="figure-slot__copy">
              <p className="figure-slot__label">{slot.label}</p>
              <p className="figure-slot__name">{slot.component?.name ?? t("figure.empty")}</p>
              <p className="figure-slot__meta">{slot.component ? `Rebrickable · ${slot.component.rebrickablePartNum}` : t("figure.none")}</p>
            </div>
          </Card>
        ))}
      </div>
      <div className="figure-panel__actions">
        <Button onClick={() => void onSaveToCollection()} size="sm" variant="primary">{t("figure.collection.save")}</Button>
        <Button onClick={onExport} size="sm" variant="secondary">{t("figure.export")}</Button>
        <Button onClick={() => importInputRef.current?.click()} size="sm" variant="ghost">{t("figure.import")}</Button>
        <input
          accept="application/json,.json"
          aria-label={t("figure.importLabel")}
          className="figure-panel__file-input"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void onImport(file);
            event.currentTarget.value = "";
          }}
          ref={importInputRef}
          type="file"
        />
      </div>
      <div className="figure-collection" aria-labelledby="figure-collection-heading">
        <div className="figure-collection__header">
          <h3 id="figure-collection-heading">{t("figure.collection.title")}</h3>
          <Button onClick={() => void onClearLocalData()} size="sm" variant="danger">{t("figure.collection.clear")}</Button>
        </div>
        {savedFigures.length === 0 ? (
          <p className="figure-collection__empty">{t("figure.collection.empty")}</p>
        ) : (
          <ul className="figure-collection__list">
            {savedFigures.map((saved) => (
              <li className="figure-collection__item" key={saved.id}>
                <span>
                  <strong>{saved.document.name}</strong>
                  <small>{new Date(saved.updatedAt).toLocaleDateString()}</small>
                </span>
                <span className="figure-collection__item-actions">
                  <Button onClick={() => void onLoadFromCollection(saved)} size="sm" variant="ghost">{t("figure.collection.load")}</Button>
                  <Button onClick={() => void onDeleteFromCollection(saved.id)} size="sm" variant="danger">{t("figure.collection.delete")}</Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <StatusMessage className="figure-panel__status" tone={saveStatus === "error" ? "danger" : "success"}>
        {saveStatus === "loading"
          ? t("figure.save.loading")
          : saveStatus === "saved"
            ? t("figure.save.saved")
            : t("figure.save.error")}
      </StatusMessage>
      <StatusMessage className="figure-panel__status" tone={transferMessage?.startsWith("Fehler") ? "danger" : "info"}>
        {transferMessage ?? t("figure.transfer.default")}
      </StatusMessage>
    </aside>
  );
}
