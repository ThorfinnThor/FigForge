import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/Button.js";
import { StatusMessage } from "./ui/StatusMessage.js";
import {
  compileShopExport,
  describeShopExportCoverage,
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
  stepNumber?: 1 | 2;
};

type ShopTarget = {
  result: ShopExportResult;
  title: string;
  recommended: boolean;
  fileName: string;
  serialize: (result: ShopExportResult) => string;
  link: ShopLink;
  linkLabel: string;
  summary: string;
  downloadLabel: string;
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

export function ShopExportPanel({ selections, stepNumber = 2 }: ShopExportPanelProps) {
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
      result: compileShopExport("rebrickable", selections, lookup),
      title: t("shop.rebrickable.title"),
      recommended: true,
      fileName: "figforge-rebrickable.csv",
      serialize: serializeRebrickableCsv,
      link: { href: REBRICKABLE_URL, affiliate: false },
      linkLabel: t("shop.rebrickable.open"),
      summary: t("shop.rebrickable.summary"),
      downloadLabel: t("shop.rebrickable.download"),
    },
    {
      result: compileShopExport("lego-pick-a-brick", selections, lookup),
      title: "LEGO Pick a Brick",
      recommended: false,
      fileName: "figforge-pick-a-brick.csv",
      serialize: serializePickABrickCsv,
      link: applyAffiliateTemplate(PICK_A_BRICK_URL, import.meta.env.VITE_LEGO_AFFILIATE_LINK_TEMPLATE),
      linkLabel: t("shop.pickABrick.open"),
      summary: t("shop.pickABrick.summary"),
      downloadLabel: t("shop.pickABrick.download"),
    },
  ] : null, [lookup, selections, t]);
  const coverage = useMemo(() => targets ? selections.map((selection) => ({
    selection,
    targets: targets.map((target) => ({
      target,
      coverage: describeShopExportCoverage([selection], target.result)[0]!,
    })),
  })) : [], [selections, targets]);

  return (
    <section className="shop-export" aria-labelledby="shop-export-heading">
      <div className="purchase-step-heading">
        <span className="purchase-step-heading__number" aria-hidden="true">{stepNumber}</span>
        <div>
          <h3 className="shop-export__heading" id="shop-export-heading">{t("shop.title")}</h3>
          <p>{t("shop.lede")}</p>
        </div>
      </div>
      {selections.length === 0 ? (
        <p className="shop-export__empty">{t("shop.empty")}</p>
      ) : loadFailed ? (
        <StatusMessage tone="danger">{t("shop.loadError")}</StatusMessage>
      ) : !targets ? (
        <p className="shop-export__empty">{t("shop.loading")}</p>
      ) : (
        <>
          <div className="shop-export__targets">
            {targets.map((target) => (
              <article className="shop-export__target" data-recommended={target.recommended || undefined} data-target={target.result.target} key={target.result.target}>
                <div className="shop-export__row">
                  <div>
                    <p className="shop-export__title">{target.title}</p>
                    {target.recommended ? <span className="shop-export__recommended">{t("shop.recommended")}</span> : null}
                  </div>
                  <p className="shop-export__count" data-complete={target.result.status === "complete" || undefined}>
                    {t("shop.readyCount", { exported: partCount(target.result), total: selections.length })}
                  </p>
                </div>
                <p className="shop-export__summary">{target.summary}</p>
                <div className="shop-export__actions">
                  <Button
                    className="shop-export__download"
                    disabled={target.result.lines.length === 0}
                    onClick={() => {
                      downloadTextFile(target.serialize(target.result), target.fileName, "text/csv;charset=utf-8");
                      setMessage(target.result.status === "partial"
                        ? t("shop.downloaded.partial", { fileName: target.fileName, count: target.result.blockers.length })
                        : t("shop.downloaded.complete", { fileName: target.fileName }));
                    }}
                    size="md"
                    variant={target.recommended ? "primary" : "secondary"}
                  >
                    {target.downloadLabel}
                  </Button>
                  <a
                    className="ff-button ff-button--ghost ff-button--md shop-export__link"
                    href={target.link.href}
                    rel={target.link.affiliate ? "sponsored noopener noreferrer" : "noopener noreferrer"}
                    target="_blank"
                  >
                    {target.linkLabel}
                  </a>
                </div>
                {target.result.status === "partial" ? (
                  <p className="shop-export__partial">{t("shop.partialHint")}</p>
                ) : null}
              </article>
            ))}
          </div>
          <details className="shop-export__details">
            <summary>{t("shop.details.summary")}</summary>
            <div className="shop-export__coverage">
              <div>
                <p className="shop-export__title">{t("shop.coverage.title")}</p>
                <p className="shop-export__coverage-hint">{t("shop.coverage.hint", { count: selections.length })}</p>
              </div>
              <ul className="shop-export__coverage-list">
                {coverage.map(({ selection, targets: selectionTargets }) => (
                  <li className="shop-export__coverage-part" key={`${selection.slot}:${selection.rebrickablePartNum}`}>
                    <p className="shop-export__coverage-name">
                      <span>{t(`figure.${selection.slot}`)}</span>
                      <strong>{selection.name}</strong>
                    </p>
                    <dl className="shop-export__coverage-targets">
                      {selectionTargets.map(({ coverage: targetCoverage, target }) => (
                        <div data-status={targetCoverage.status} key={target.result.target}>
                          <dt>{target.title}</dt>
                          <dd>
                            <strong>
                              <span aria-hidden="true">{targetCoverage.status === "included" ? "✓" : "×"}</span>
                              {t(`shop.coverage.${targetCoverage.status}`)}
                            </strong>
                            {targetCoverage.reason ? <small>{t(`shop.blocked.${targetCoverage.reason}`)}</small> : null}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
            </div>
            <p className="shop-export__hint">{t("shop.disclaimer")}</p>
          </details>
        </>
      )}
      {message ? <StatusMessage className="shop-export__message" tone="success">{message}</StatusMessage> : null}
    </section>
  );
}
