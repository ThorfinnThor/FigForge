import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/Button.js";
import { StatusMessage } from "./ui/StatusMessage.js";
import {
  compileShopExport,
  serializePickABrickCsv,
  serializeRebrickableCsv,
  type ShopExportLookup,
  type ShopExportResult,
  type ShopExportSelection,
} from "../procurement/shop-export.js";
import { loadShopExportLookup } from "../procurement/shop-export-data.js";
import {
  applyAffiliateTemplate,
  PICK_A_BRICK_URL,
  REBRICKABLE_URL,
  type ShopLink,
} from "../procurement/shop-links.js";
import { useI18n } from "../i18n.js";

type ShopExportPanelProps = {
  selections: readonly ShopExportSelection[];
};

type ShopTarget = {
  result: ShopExportResult;
  title: string;
  fileName: string;
  serialize: (result: ShopExportResult) => string;
  link: ShopLink;
  linkLabel: string;
  hint: string;
};

const downloadTextFile = (content: string, fileName: string, type: string): void => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

const partCount = (result: ShopExportResult): number =>
  result.lines.reduce((sum, line) => sum + line.quantity, 0);

type BlockedPart = {
  key: string;
  name: string;
  reason: ShopExportResult["blockers"][number]["reason"];
  onlyPickABrick: boolean;
};

/** One list for both shops: a part blocked everywhere is named once, Pick-a-Brick-only gaps are marked. */
const blockedParts = (targets: readonly ShopTarget[]): BlockedPart[] => {
  const [pickABrick, rebrickable] = targets.map(({ result }) => result);
  const rebrickableBlocked = new Set(rebrickable?.blockers.map(({ slot }) => slot));
  return (pickABrick?.blockers ?? []).map((blocker) => ({
    key: `${blocker.slot}:${blocker.rebrickablePartNum}`,
    name: blocker.name,
    reason: blocker.reason,
    onlyPickABrick: !rebrickableBlocked.has(blocker.slot),
  }));
};

export function ShopExportPanel({ selections }: ShopExportPanelProps) {
  const { t } = useI18n();
  const [lookup, setLookup] = useState<ShopExportLookup | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const rolesKey = [...new Set(selections.map(({ slot }) => slot))].sort().join(",");

  useEffect(() => {
    let active = true;
    setLookup(null);
    setLoadFailed(false);
    const roles = rolesKey ? rolesKey.split(",") as ShopExportSelection["slot"][] : [];
    void loadShopExportLookup(roles)
      .then((loaded) => { if (active) setLookup(() => loaded); })
      .catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [rolesKey]);

  const targets = useMemo<ShopTarget[] | null>(() => lookup ? [
    {
      result: compileShopExport("lego-pick-a-brick", selections, lookup),
      title: "LEGO Pick a Brick",
      fileName: "figforge-pick-a-brick.csv",
      serialize: serializePickABrickCsv,
      link: applyAffiliateTemplate(PICK_A_BRICK_URL, import.meta.env.VITE_LEGO_AFFILIATE_LINK_TEMPLATE),
      linkLabel: t("shop.pickABrick.open"),
      hint: t("shop.pickABrick.hint"),
    },
    {
      result: compileShopExport("rebrickable", selections, lookup),
      title: t("shop.rebrickable.title"),
      fileName: "figforge-rebrickable.csv",
      serialize: serializeRebrickableCsv,
      link: { href: REBRICKABLE_URL, affiliate: false },
      linkLabel: t("shop.rebrickable.open"),
      hint: t("shop.rebrickable.hint"),
    },
  ] : null, [lookup, selections, t]);

  return (
    <section className="shop-export" aria-labelledby="shop-export-heading">
      <h3 className="shop-export__heading" id="shop-export-heading">{t("shop.title")}</h3>
      {selections.length === 0 ? (
        <p className="shop-export__empty">{t("shop.empty")}</p>
      ) : loadFailed ? (
        <StatusMessage tone="danger">{t("shop.loadError")}</StatusMessage>
      ) : !targets ? (
        <p className="shop-export__empty">{t("shop.loading")}</p>
      ) : (
        <>
          {blockedParts(targets).length > 0 ? (
            <div className="shop-export__blocked">
              <p className="shop-export__title">{t("shop.blocked.title")}</p>
              <ul className="shop-export__blockers">
                {blockedParts(targets).map((part) => (
                  <li key={part.key}>
                    <strong>{part.name}</strong>
                    {part.onlyPickABrick ? ` ${t("shop.blocked.pickOnly")}` : ""}: {t(`shop.blocked.${part.reason}`)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {targets.map((target) => (
            <div className="shop-export__target" data-target={target.result.target} key={target.result.target}>
              <div className="shop-export__row">
                <p className="shop-export__title">{target.title}</p>
                <p className="shop-export__count">{t("shop.count", { exported: partCount(target.result), total: selections.length })}</p>
              </div>
              <div className="shop-export__actions">
                <Button
                  disabled={target.result.lines.length === 0}
                  onClick={() => {
                    downloadTextFile(target.serialize(target.result), target.fileName, "text/csv;charset=utf-8");
                    setMessage(target.result.status === "partial"
                      ? t("shop.downloaded.partial", { fileName: target.fileName, count: target.result.blockers.length })
                      : t("shop.downloaded.complete", { fileName: target.fileName }));
                  }}
                  size="sm"
                  variant="secondary"
                >
                  {target.result.status === "partial" ? t("shop.download.partial") : t("shop.download.complete")}
                </Button>
                <a
                  className="ff-button ff-button--ghost ff-button--sm shop-export__link"
                  href={target.link.href}
                  rel={target.link.affiliate ? "sponsored noopener noreferrer" : "noopener noreferrer"}
                  target="_blank"
                >
                  {target.linkLabel}
                </a>
              </div>
              <p className="shop-export__hint">
                {target.link.affiliate ? <span className="shop-export__ad">{t("shop.ad")}</span> : null}
                {target.hint}
              </p>
            </div>
          ))}
        </>
      )}
      <p className="shop-export__hint">{t("shop.disclaimer")}</p>
      {message ? <StatusMessage className="figure-panel__status" tone="info">{message}</StatusMessage> : null}
    </section>
  );
}
