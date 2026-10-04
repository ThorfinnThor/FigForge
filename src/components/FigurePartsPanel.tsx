import { Card } from "./ui/Card.js";
import { Button } from "./ui/Button.js";
import { StatusMessage } from "./ui/StatusMessage.js";
import type { CatalogPackagePart } from "../contracts/catalog-package.js";
import type { ShopExportColor } from "../contracts/shop-export.js";
import type { SavedFigure } from "../storage/figure-draft-store.js";
import { useRef, type ReactNode, type RefObject } from "react";
import { useI18n } from "../i18n.js";

type FigureSlot = {
  id: CatalogPackagePart["role"];
  label: string;
  component: CatalogPackagePart | undefined;
  thumbnailUrl?: string | undefined;
  colors: readonly ShopExportColor[];
  selectedColorId?: number | undefined;
};

type FigurePartsPanelProps = {
  closeButtonRef?: RefObject<HTMLButtonElement | null>;
  drawer?: boolean;
  onClose?: () => void;
  onExport: () => void;
  onShare: () => Promise<void>;
  onImport: (file: File) => Promise<void>;
  onSaveToCollection: () => Promise<void>;
  onLoadFromCollection: (saved: SavedFigure) => Promise<void>;
  onDeleteFromCollection: (id: string) => Promise<void>;
  onClearLocalData: () => Promise<void>;
  onColorChange: (slot: CatalogPackagePart["role"], colorId: number | undefined) => void;
  onRemove: (slot: CatalogPackagePart["role"]) => void;
  saveStatus: "loading" | "saved" | "error";
  savedFigures: readonly SavedFigure[];
  shopExport?: ReactNode;
  transferMessage: string | null;
  transferMessageTone: "danger" | "info";
  shareLink: string | null;
  slots: readonly FigureSlot[];
};

export function FigurePartsPanel({
  closeButtonRef,
  drawer = false,
  onClose,
  onExport,
  onShare,
  onImport,
  onSaveToCollection,
  onLoadFromCollection,
  onDeleteFromCollection,
  onClearLocalData,
  onColorChange,
  onRemove,
  saveStatus,
  savedFigures,
  shopExport,
  slots,
  transferMessage,
  transferMessageTone,
  shareLink,
}: FigurePartsPanelProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const { language, t } = useI18n();

  return (
    <aside className={["figure-panel", drawer ? "figure-panel--drawer" : ""].filter(Boolean).join(" ")} id="figure-panel" aria-labelledby="figure-panel-heading">
      <span className="figure-panel__hang" aria-hidden="true" />
      <div className="figure-panel__scroll">
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
                {slot.component ? slot.colors.length > 1 ? (
                  <label className="figure-slot__color">
                    <span>{t("figure.color")}</span>
                    <select
                      aria-label={t("figure.colorLabel", { part: slot.component.name })}
                      onChange={(event) => onColorChange(
                        slot.id,
                        event.currentTarget.value === "" ? undefined : Number(event.currentTarget.value),
                      )}
                      value={slot.selectedColorId ?? ""}
                    >
                      <option value="">{t("figure.colorChoose")}</option>
                      {slot.colors.map((color) => (
                        <option key={color.rebrickableColorId} value={color.rebrickableColorId}>
                          {color.colorName}
                        </option>
                      ))}
                    </select>
                    <small>{t("figure.colorPurchaseHint")}</small>
                  </label>
                ) : (
                  <p className="figure-slot__color-name">
                    {t("figure.color")}: {slot.colors[0]?.colorName ?? t("figure.colorUnknown")}
                  </p>
                ) : null}
                {slot.component ? (
                  <Button
                    aria-label={t("figure.removePart", { part: slot.component.name, slot: slot.label })}
                    className="figure-slot__remove"
                    onClick={() => onRemove(slot.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {t("figure.remove")}
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
        {shopExport}
        <div className="figure-panel__actions">
          <Button onClick={() => void onSaveToCollection()} size="sm" variant="primary">{t("figure.collection.save")}</Button>
          <Button onClick={onExport} size="sm" variant="secondary">{t("figure.export")}</Button>
          <Button onClick={() => void onShare()} size="sm" variant="secondary">{t("figure.share")}</Button>
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
        {shareLink ? (
          <label className="figure-panel__share-link">
            <span>{t("figure.shareLink")}</span>
            <input readOnly onFocus={(event) => event.currentTarget.select()} value={shareLink} />
          </label>
        ) : null}
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
                    <small>{new Date(saved.updatedAt).toLocaleDateString(language)}</small>
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
        <StatusMessage className="figure-panel__status" tone={transferMessageTone}>
          {transferMessage ?? t("figure.transfer.default")}
        </StatusMessage>
      </div>
    </aside>
  );
}
