import { Card } from "./ui/Card.js";
import { Button } from "./ui/Button.js";
import { StatusMessage } from "./ui/StatusMessage.js";
import type { CatalogPackagePart } from "../contracts/catalog-package.js";
import type { ShopExportColor } from "../contracts/shop-export.js";
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
  onSaveToCollection: () => void;
  collectionSavePending: boolean;
  previewSynchronized: boolean;
  onColorChange: (slot: CatalogPackagePart["role"], colorId: number | undefined) => void;
  onRemove: (slot: CatalogPackagePart["role"]) => void;
  saveStatus: "loading" | "saved" | "error";
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
  collectionSavePending,
  previewSynchronized,
  onColorChange,
  onRemove,
  saveStatus,
  shopExport,
  slots,
  transferMessage,
  transferMessageTone,
  shareLink,
}: FigurePartsPanelProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const filledSlots = slots.filter((slot) => slot.component);
  const configurableColorSlots = filledSlots.filter((slot) => slot.colors.length > 1);
  const missingColorCount = configurableColorSlots.filter((slot) => slot.selectedColorId === undefined).length;

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
                {slot.component ? (
                  <p
                    className="figure-slot__color-name"
                    data-status={slot.colors.length > 1 && slot.selectedColorId === undefined ? "attention" : "ready"}
                  >
                    {slot.colors.length > 1 && slot.selectedColorId === undefined
                      ? t("figure.purchaseColors.chooseBelow")
                      : `${t("figure.color")}: ${slot.colors.find((color) => color.rebrickableColorId === slot.selectedColorId)?.colorName ?? slot.colors[0]?.colorName ?? t("figure.colorUnknown")}`}
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
        {filledSlots.length > 0 ? (
          <section className="purchase-colors" aria-labelledby="purchase-colors-heading">
            <div className="purchase-step-heading">
              <span className="purchase-step-heading__number" aria-hidden="true">1</span>
              <div>
                <h3 id="purchase-colors-heading">{t("figure.purchaseColors.title")}</h3>
                <p>{t("figure.purchaseColors.intro")}</p>
              </div>
            </div>
            {configurableColorSlots.length === 0 ? (
              <p aria-live="polite" className="purchase-colors__status" data-status="ready" role="status">
                <span aria-hidden="true">✓</span>
                {t("figure.purchaseColors.automatic")}
              </p>
            ) : (
              <>
                <p
                  aria-live="polite"
                  className="purchase-colors__status"
                  data-status={missingColorCount === 0 ? "ready" : "attention"}
                  role="status"
                >
                  <span aria-hidden="true">{missingColorCount === 0 ? "✓" : "!"}</span>
                  {missingColorCount === 0
                    ? t("figure.purchaseColors.ready")
                    : t("figure.purchaseColors.missing", { count: missingColorCount })}
                </p>
                <div className="purchase-colors__choices">
                  {configurableColorSlots.map((slot) => (
                    <label className="purchase-color-choice" data-missing={slot.selectedColorId === undefined || undefined} key={slot.id}>
                      <span className="purchase-color-choice__part">
                        <strong>{slot.label}</strong>
                        <small>{slot.component?.name}</small>
                      </span>
                      <select
                        aria-label={t("figure.colorLabel", { part: slot.component?.name ?? slot.label })}
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
                    </label>
                  ))}
                </div>
              </>
            )}
            <p className="purchase-colors__help">{t("figure.colorPurchaseHint")}</p>
          </section>
        ) : null}
        {shopExport}
        {!previewSynchronized ? (
          <StatusMessage tone="warning">{t("figure.preview.stale")}</StatusMessage>
        ) : null}
        <div className="figure-panel__actions">
          <Button loading={collectionSavePending} onClick={onSaveToCollection} size="sm" variant="primary">{t("figure.collection.save")}</Button>
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
        {saveStatus === "error" ? (
          <StatusMessage className="figure-panel__status" tone="danger">{t("figure.save.error")}</StatusMessage>
        ) : null}
        {transferMessage ? (
          <StatusMessage className="figure-panel__status" tone={transferMessageTone}>{transferMessage}</StatusMessage>
        ) : null}
      </div>
    </aside>
  );
}
