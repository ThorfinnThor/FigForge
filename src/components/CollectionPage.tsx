import { useEffect, useState } from "react";
import { collectionFiguresForStage, type CollectionFigure } from "../collection/collection-figures.js";
import {
  PLAYGROUND_LAYOUT_MAX_FIGURES,
  PLAYGROUND_MAX_STAGES,
  createPlaygroundStage,
  createPlaygroundStages,
  reconcilePlaygroundStages,
  type PlaygroundStage,
  type PlaygroundStages,
} from "../contracts/playground-layout.js";
import { useI18n } from "../i18n.js";
import { downloadFigureDocument } from "../figure/download-figure-document.js";
import {
  clearLocalFigureData,
  listSavedFigures,
  loadCurrentPlaygroundStages,
  saveCurrentPlaygroundStages,
  type SavedFigure,
} from "../storage/figure-draft-store.js";
import { CollectionFigureCard } from "./CollectionFigureCard.js";
import { CollectionPurchaseDialog } from "./CollectionPurchaseDialog.js";
import { CollectionViewport } from "./CollectionViewport.js";
import { StageNameDialog } from "./StageNameDialog.js";
import { Button } from "./ui/Button.js";

const createStageId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `stage-${crypto.randomUUID()}`;
  return `stage-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export function CollectionPage() {
  const { language, setLanguage, t } = useI18n();
  const defaultStageName = t("collection.defaultStageName");
  const [figures, setFigures] = useState<readonly CollectionFigure[]>([]);
  const [collection, setCollection] = useState<readonly SavedFigure[]>([]);
  const [playground, setPlayground] = useState<PlaygroundStages | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [actionError, setActionError] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [purchaseFigure, setPurchaseFigure] = useState<SavedFigure | null>(null);
  const [stageDialogMode, setStageDialogMode] = useState<"create" | "rename" | null>(null);
  const [isSavingLayout, setIsSavingLayout] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listSavedFigures(), loadCurrentPlaygroundStages(defaultStageName)])
      .then(async ([collection, storedPlayground]) => {
        const availableIds = new Set(collection.map(({ id }) => id));
        const defaultStage = createPlaygroundStage(
          "stage-main",
          defaultStageName,
          collection.slice(0, PLAYGROUND_LAYOUT_MAX_FIGURES).map(({ id }) => id),
        );
        const initialPlayground = storedPlayground ?? createPlaygroundStages([defaultStage], defaultStage.id);
        const playground = reconcilePlaygroundStages(
          initialPlayground,
          availableIds,
        );
        const storedReferenceCount = storedPlayground?.stages.reduce(
          (count, stage) => count + stage.savedFigureIds.length,
          0,
        ) ?? 0;
        const reconciledReferenceCount = playground.stages.reduce(
          (count, stage) => count + stage.savedFigureIds.length,
          0,
        );
        if (!storedPlayground || storedReferenceCount !== reconciledReferenceCount) {
          await saveCurrentPlaygroundStages({ ...playground, updatedAt: new Date().toISOString() });
        }
        const activeStage = playground.stages.find(({ id }) => id === playground.activeStageId)!;
        const resolvedFigures = await collectionFiguresForStage(collection, activeStage);
        if (!cancelled) {
          setCollection(collection);
          setPlayground(playground);
          setFigures(resolvedFigures);
          setLoadState("ready");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error("Collection could not be loaded", error);
          setLoadState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePlayground = async (nextPlayground: PlaygroundStages): Promise<void> => {
    if (!playground || isSavingLayout) return;
    setActionError(false);
    setIsSavingLayout(true);
    try {
      await saveCurrentPlaygroundStages(nextPlayground);
      const nextActiveStage = nextPlayground.stages.find(({ id }) => id === nextPlayground.activeStageId)!;
      const resolvedFigures = await collectionFiguresForStage(collection, nextActiveStage);
      setPlayground(nextPlayground);
      setFigures(resolvedFigures);
    } catch {
      setActionError(true);
    } finally {
      setIsSavingLayout(false);
    }
  };

  const activeStage = playground?.stages.find(({ id }) => id === playground.activeStageId) ?? null;

  const replaceActiveStage = (nextStage: PlaygroundStage): PlaygroundStages | null => {
    if (!playground || !activeStage) return null;
    return createPlaygroundStages(
      playground.stages.map((stage) => stage.id === activeStage.id ? nextStage : stage),
      playground.activeStageId,
    );
  };

  const addToStage = (id: string): void => {
    if (!activeStage
      || activeStage.savedFigureIds.includes(id)
      || activeStage.savedFigureIds.length >= PLAYGROUND_LAYOUT_MAX_FIGURES) return;
    const next = replaceActiveStage(createPlaygroundStage(
      activeStage.id,
      activeStage.name,
      [...activeStage.savedFigureIds, id],
    ));
    if (next) void updatePlayground(next);
  };

  const removeFromStage = (id: string): void => {
    if (!activeStage || !activeStage.savedFigureIds.includes(id)) return;
    const next = replaceActiveStage(createPlaygroundStage(
      activeStage.id,
      activeStage.name,
      activeStage.savedFigureIds.filter((figureId) => figureId !== id),
    ));
    if (next) void updatePlayground(next);
  };

  const moveOnStage = (id: string, direction: -1 | 1): void => {
    if (!activeStage) return;
    const index = activeStage.savedFigureIds.indexOf(id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= activeStage.savedFigureIds.length) return;
    const ids = [...activeStage.savedFigureIds];
    const current = ids[index];
    const target = ids[targetIndex];
    if (!current || !target) return;
    ids[index] = target;
    ids[targetIndex] = current;
    const next = replaceActiveStage(createPlaygroundStage(activeStage.id, activeStage.name, ids));
    if (next) void updatePlayground(next);
  };

  const selectStage = (stageId: string): void => {
    if (!playground || playground.activeStageId === stageId) return;
    void updatePlayground(createPlaygroundStages(playground.stages, stageId));
  };

  const saveStageName = (name: string): void => {
    if (!playground) return;
    if (stageDialogMode === "create") {
      const stage = createPlaygroundStage(createStageId(), name);
      setStageDialogMode(null);
      void updatePlayground(createPlaygroundStages([...playground.stages, stage], stage.id));
      return;
    }
    if (stageDialogMode === "rename" && activeStage) {
      const next = replaceActiveStage(createPlaygroundStage(
        activeStage.id,
        name,
        activeStage.savedFigureIds,
      ));
      setStageDialogMode(null);
      if (next) void updatePlayground(next);
    }
  };

  const deleteActiveStage = (): void => {
    if (!playground || !activeStage || playground.stages.length <= 1) return;
    if (!window.confirm(t("collection.deleteStageConfirm", { name: activeStage.name }))) return;
    const activeIndex = playground.stages.findIndex(({ id }) => id === activeStage.id);
    const remainingStages = playground.stages.filter(({ id }) => id !== activeStage.id);
    const nextActiveStage = remainingStages[Math.min(activeIndex, remainingStages.length - 1)]!;
    void updatePlayground(createPlaygroundStages(remainingStages, nextActiveStage.id));
  };

  const clearLocalData = async (): Promise<void> => {
    if (!window.confirm(t("figure.collection.clearConfirm"))) return;
    setActionError(false);
    setIsSavingLayout(true);
    try {
      await clearLocalFigureData();
      setCollection([]);
      setFigures([]);
      const stage = createPlaygroundStage("stage-main", defaultStageName);
      setPlayground(createPlaygroundStages([stage], stage.id));
    } catch {
      setActionError(true);
    } finally {
      setIsSavingLayout(false);
    }
  };

  const exportFigure = (saved: SavedFigure): void => {
    setExportError(false);
    try {
      downloadFigureDocument(saved.document);
    } catch {
      setExportError(true);
    }
  };

  const openPurchaseDialog = (saved: SavedFigure): void => {
    setExportError(false);
    setPurchaseFigure(saved);
  };

  const stageIds = new Set(activeStage?.savedFigureIds ?? []);
  const stageFull = (activeStage?.savedFigureIds.length ?? 0) >= PLAYGROUND_LAYOUT_MAX_FIGURES;

  return (
    <div className="app-shell collection-shell">
      <header className="app-header">
        <a className="wordmark" href="/">Fig<span>Forge</span></a>
        <nav className="app-nav" aria-label={t("nav.label")}>
          <a className="app-nav__link" href="/">{t("nav.builder")}</a>
          <a className="app-nav__link app-nav__link--active" href="/collection" aria-current="page">
            {t("nav.collection")}
          </a>
          <a className="app-nav__link" href="/methodology">{t("nav.notes")}</a>
        </nav>
        <span className="app-header__status">{t("header.status")}</span>
        <label className="language-picker">
          <span>{t("language.label")}</span>
          <select
            aria-label={t("language.label")}
            value={language}
            onChange={(event) => setLanguage(event.currentTarget.value as "de" | "en")}
          >
            <option value="de">{t("language.de")}</option>
            <option value="en">{t("language.en")}</option>
          </select>
        </label>
      </header>

      <div className="collection-page">
        <section className="collection-page__hero" aria-labelledby="collection-title">
          <div>
            <p className="collection-page__eyebrow">FigForge</p>
            <h1 id="collection-title">{t("collection.title")}</h1>
            <p>{t("collection.lede")}</p>
          </div>
          <a className="ff-button ff-button--primary" href="/">{t("collection.backToBuilder")}</a>
        </section>
        <section className="collection-page__stage" aria-labelledby="collection-stage-title">
          <header className="collection-page__stage-header">
            <div>
              <p className="collection-page__eyebrow">{t("collection.stageEyebrow")}</p>
              <h2 id="collection-stage-title">{activeStage?.name ?? t("collection.stageTitle")}</h2>
            </div>
            <span className="collection-page__stage-count">
              {t("collection.stageCount", { count: activeStage?.savedFigureIds.length ?? 0, max: PLAYGROUND_LAYOUT_MAX_FIGURES })}
            </span>
          </header>
          {loadState === "ready" && playground && activeStage ? (
            <div className="collection-stage-controls">
              <label className="collection-stage-controls__picker">
                <span>{t("collection.stagePickerLabel")}</span>
                <select
                  disabled={isSavingLayout}
                  onChange={(event) => selectStage(event.currentTarget.value)}
                  value={activeStage.id}
                >
                  {playground.stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name} ({stage.savedFigureIds.length}/{PLAYGROUND_LAYOUT_MAX_FIGURES})
                    </option>
                  ))}
                </select>
              </label>
              <div className="collection-stage-controls__actions">
                <Button
                  disabled={isSavingLayout || playground.stages.length >= PLAYGROUND_MAX_STAGES}
                  onClick={() => setStageDialogMode("create")}
                  size="sm"
                  variant="primary"
                >
                  + {t("collection.newStage")}
                </Button>
                <Button disabled={isSavingLayout} onClick={() => setStageDialogMode("rename")} size="sm" variant="ghost">
                  {t("collection.renameStage")}
                </Button>
                <Button
                  disabled={isSavingLayout || playground.stages.length <= 1}
                  onClick={deleteActiveStage}
                  size="sm"
                  variant="danger"
                >
                  {t("collection.deleteStage")}
                </Button>
              </div>
            </div>
          ) : null}
          {loadState === "loading" ? <p>{t("collection.loading")}</p> : null}
          {loadState === "error" ? <p>{t("collection.loadError")}</p> : null}
          {loadState === "ready" ? <CollectionViewport figures={figures} /> : null}
        </section>

        {loadState === "ready" ? (
          <section className="collection-library" aria-labelledby="collection-library-title">
            <header className="collection-library__header">
              <div>
                <p className="collection-page__eyebrow">{t("collection.libraryEyebrow")}</p>
                <h2 id="collection-library-title">{t("collection.libraryTitle")}</h2>
                <p>{t("collection.libraryLede")}</p>
              </div>
              <span className="collection-library__count">
                {t("collection.figureCount", { count: collection.length })}
              </span>
            </header>
            {actionError ? <p className="collection-library__error" role="alert">{t("collection.actionError")}</p> : null}
            {collection.length === 0 ? (
              <p className="collection-viewport__empty">{t("collection.libraryEmpty")}</p>
            ) : (
              <ul className="collection-library__list">
                {collection.map((saved) => {
                  const onStage = stageIds.has(saved.id);
                  const stageIndex = activeStage?.savedFigureIds.indexOf(saved.id) ?? -1;
                  return (
                    <CollectionFigureCard
                      busy={isSavingLayout}
                      key={saved.id}
                      labels={{
                        addToStage: t("collection.addToStage"),
                        removeFromStage: t("collection.removeFromStage"),
                        moveUp: t("collection.moveUp"),
                        moveDown: t("collection.moveDown"),
                        openBuilder: t("collection.openBuilder"),
                        buyFigure: t("collection.buyFigure"),
                        stageFull: t("collection.stageFull"),
                        onStage: t("collection.onStage"),
                        partCount: t("collection.partCount", { count: saved.document.selections.length }),
                        savedAt: t("collection.savedAt"),
                      }}
                      language={language}
                      onMove={(direction) => moveOnStage(saved.id, direction)}
                      onBuy={() => openPurchaseDialog(saved)}
                      onStage={onStage}
                      onToggleStage={() => onStage ? removeFromStage(saved.id) : addToStage(saved.id)}
                      saved={saved}
                      stageFull={stageFull}
                      stageIndex={stageIndex}
                      stageSize={activeStage?.savedFigureIds.length ?? 0}
                    />
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        {loadState === "ready" ? (
          <details className="collection-data">
            <summary>{t("collection.dataTitle")}</summary>
            <div className="collection-data__body">
              <p>{t("figure.save.saved")}</p>
              <p>{t("figure.transfer.default")}</p>
              <Button disabled={isSavingLayout} onClick={() => void clearLocalData()} size="sm" variant="danger">
                {t("figure.collection.clear")}
              </Button>
            </div>
          </details>
        ) : null}
      </div>
      {purchaseFigure ? (
        <CollectionPurchaseDialog
          exportError={exportError}
          onClose={() => setPurchaseFigure(null)}
          onExportJson={() => exportFigure(purchaseFigure)}
          saved={purchaseFigure}
        />
      ) : null}
      {stageDialogMode ? (
        <StageNameDialog
          initialName={stageDialogMode === "rename" ? activeStage?.name ?? "" : ""}
          mode={stageDialogMode}
          onClose={() => setStageDialogMode(null)}
          onSubmit={saveStageName}
        />
      ) : null}
    </div>
  );
}
