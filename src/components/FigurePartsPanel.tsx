import { Card } from "./ui/Card.js";
import { Button } from "./ui/Button.js";
import { StatusMessage } from "./ui/StatusMessage.js";
import type { CatalogPackagePart } from "../contracts/catalog-package.js";
import { useRef, type ReactNode, type RefObject } from "react";

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
  saveStatus: "loading" | "saved" | "error";
  shopExport?: ReactNode;
  transferMessage: string | null;
  slots: readonly FigureSlot[];
};

export function FigurePartsPanel({
  closeButtonRef,
  drawer = false,
  onClose,
  onExport,
  onImport,
  saveStatus,
  shopExport,
  slots,
  transferMessage,
}: FigurePartsPanelProps) {
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className={["figure-panel", drawer ? "figure-panel--drawer" : ""].filter(Boolean).join(" ")} id="figure-panel" aria-labelledby="figure-panel-heading">
      <span className="figure-panel__hang" aria-hidden="true" />
      <div className="figure-panel__header">
        <div>
          <p className="eyebrow">Auswahl</p>
          <h2 id="figure-panel-heading">Deine Figur</h2>
        </div>
        <div className="figure-panel__header-actions">
          <span className="figure-panel__count">{slots.length} Slots</span>
          {drawer ? (
            <button
              aria-label="Figurenliste schließen"
              className="figure-panel__close"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              Schließen
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
              <p className="figure-slot__name">{slot.component?.name ?? "Nicht belegt"}</p>
              <p className="figure-slot__meta">{slot.component ? `Rebrickable · ${slot.component.rebrickablePartNum}` : "Keine Auswahl"}</p>
            </div>
          </Card>
        ))}
      </div>
      {shopExport}
      <div className="figure-panel__actions">
        <Button onClick={onExport} size="sm" variant="secondary">Figur als JSON speichern</Button>
        <Button onClick={() => importInputRef.current?.click()} size="sm" variant="ghost">JSON laden</Button>
        <input
          accept="application/json,.json"
          aria-label="FigForge-JSON auswählen"
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
      <StatusMessage className="figure-panel__status" tone={saveStatus === "error" ? "danger" : "success"}>
        {saveStatus === "loading"
          ? "Lokaler Entwurf wird geladen …"
          : saveStatus === "saved"
            ? "Auf diesem Gerät gespeichert."
            : "Lokales Speichern ist fehlgeschlagen; JSON-Export bleibt verfügbar."}
      </StatusMessage>
      <StatusMessage className="figure-panel__status" tone={transferMessage?.startsWith("Fehler") ? "danger" : "info"}>
        {transferMessage ?? "Der JSON-Export enthält nur versionierte FigForge-IDs – keine Modell-URLs, MOC-Daten oder Einkaufszuordnungen."}
      </StatusMessage>
    </aside>
  );
}
