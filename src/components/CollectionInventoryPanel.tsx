import { useRef, useState } from "react";
import type { PartInventory } from "../contracts/part-inventory.js";
import { useI18n } from "../i18n.js";
import { importBrickLinkInventory, parseBrickLinkInventoryXml, type BrickLinkImportSummary } from "../procurement/bricklink-inventory.js";
import { parsePartInventoryCsv } from "../procurement/part-inventory.js";
import { loadAllShopExportEntries } from "../procurement/shop-export-data.js";
import { savePartInventory } from "../storage/figure-draft-store.js";
import { Button } from "./ui/Button.js";
import { StatusMessage } from "./ui/StatusMessage.js";

type CollectionInventoryPanelProps = {
  inventory: PartInventory | null;
  onImported: (inventory: PartInventory) => void;
};

export function CollectionInventoryPanel({ inventory, onImported }: CollectionInventoryPanelProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const brickLinkInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error" | "bricklink-success" | "bricklink-empty" | "bricklink-error">("idle");
  const [brickLinkSummary, setBrickLinkSummary] = useState<BrickLinkImportSummary | null>(null);

  const importFile = async (file: File): Promise<void> => {
    setStatus("saving");
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Inventory CSV exceeds 5 MiB");
      const parsed = parsePartInventoryCsv(await file.text(), file.name);
      await savePartInventory(parsed);
      onImported(parsed);
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const importBrickLinkFile = async (file: File): Promise<void> => {
    setStatus("saving");
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("BrickLink XML exceeds 5 MiB");
      const parsed = parseBrickLinkInventoryXml(await file.text());
      const { inventory: imported, summary } = importBrickLinkInventory(parsed.items, await loadAllShopExportEntries());
      setBrickLinkSummary({ ...summary, notInCatalog: summary.notInCatalog + parsed.skippedNonPart + parsed.skippedInvalid });
      if (imported.entries.length === 0) {
        setStatus("bricklink-empty");
        return;
      }
      await savePartInventory(imported);
      onImported(imported);
      setStatus("bricklink-success");
    } catch {
      setStatus("bricklink-error");
    } finally {
      if (brickLinkInputRef.current) brickLinkInputRef.current.value = "";
    }
  };

  const quantity = inventory?.entries.reduce((sum, entry) => sum + entry.quantity, 0) ?? 0;
  return (
    <section className="collection-inventory" aria-labelledby="collection-inventory-title">
      <div>
        <p className="collection-page__eyebrow">{t("inventory.eyebrow")}</p>
        <h2 id="collection-inventory-title">{t("inventory.title")}</h2>
        <p>{t("inventory.description")}</p>
        {inventory ? <p className="collection-inventory__count">{t("inventory.count", { count: quantity })}</p> : null}
      </div>
      <input
        accept=".csv,text/csv"
        className="visually-hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void importFile(file);
        }}
        ref={inputRef}
        type="file"
      />
      <input
        accept=".xml,text/xml,application/xml"
        className="visually-hidden"
        data-bricklink-input="true"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void importBrickLinkFile(file);
        }}
        ref={brickLinkInputRef}
        type="file"
      />
      <div className="collection-inventory__actions">
        <Button disabled={status === "saving"} onClick={() => inputRef.current?.click()} size="md" variant="secondary">
          {inventory ? t("inventory.replace") : t("inventory.import")}
        </Button>
        <Button disabled={status === "saving"} onClick={() => brickLinkInputRef.current?.click()} size="md" variant="secondary">
          {t("inventory.bricklink.import")}
        </Button>
        <p className="collection-inventory__hint">{t("inventory.bricklink.hint")}</p>
      </div>
      {status === "success" ? <StatusMessage tone="success">{t("inventory.success")}</StatusMessage> : null}
      {status === "error" ? <StatusMessage tone="danger">{t("inventory.error")}</StatusMessage> : null}
      {status === "bricklink-success" && brickLinkSummary ? (
        <StatusMessage tone="success">
          {t("inventory.bricklink.success", {
            matched: brickLinkSummary.matched,
            skipped: brickLinkSummary.notInCatalog + brickLinkSummary.ambiguous,
          })}
        </StatusMessage>
      ) : null}
      {status === "bricklink-empty" ? <StatusMessage tone="warning">{t("inventory.bricklink.empty")}</StatusMessage> : null}
      {status === "bricklink-error" ? <StatusMessage tone="danger">{t("inventory.bricklink.error")}</StatusMessage> : null}
    </section>
  );
}
