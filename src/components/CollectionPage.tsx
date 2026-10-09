import { useEffect, useState } from "react";
import { collectionFiguresForLayout, type CollectionFigure } from "../collection/collection-figures.js";
import {
  PLAYGROUND_LAYOUT_MAX_FIGURES,
  createPlaygroundLayout,
  reconcilePlaygroundLayout,
  type PlaygroundLayout,
} from "../contracts/playground-layout.js";
import { useI18n } from "../i18n.js";
import {
  listSavedFigures,
  loadCurrentPlaygroundLayout,
  saveCurrentPlaygroundLayout,
  type SavedFigure,
} from "../storage/figure-draft-store.js";
import { CollectionFigureCard } from "./CollectionFigureCard.js";
import { CollectionViewport } from "./CollectionViewport.js";

export function CollectionPage() {
  const { language, setLanguage, t } = useI18n();
  const [figures, setFigures] = useState<readonly CollectionFigure[]>([]);
  const [collection, setCollection] = useState<readonly SavedFigure[]>([]);
  const [layout, setLayout] = useState<PlaygroundLayout | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [actionError, setActionError] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listSavedFigures(), loadCurrentPlaygroundLayout()])
      .then(async ([collection, storedLayout]) => {
        const availableIds = new Set(collection.map(({ id }) => id));
        const initialLayout = storedLayout ?? createPlaygroundLayout(
          collection.slice(0, PLAYGROUND_LAYOUT_MAX_FIGURES).map(({ id }) => id),
        );
        const layout = reconcilePlaygroundLayout(
          initialLayout,
          availableIds,
        );
        if (!storedLayout && layout.savedFigureIds.length > 0) {
          await saveCurrentPlaygroundLayout(layout);
        } else if (storedLayout && layout.savedFigureIds.length !== storedLayout.savedFigureIds.length) {
          await saveCurrentPlaygroundLayout({ ...layout, updatedAt: new Date().toISOString() });
        }
        const resolvedFigures = await collectionFiguresForLayout(collection, layout);
        if (!cancelled) {
          setCollection(collection);
          setLayout(layout);
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

  const updateLayout = async (nextLayout: PlaygroundLayout): Promise<void> => {
    if (!layout || isSavingLayout) return;
    setActionError(false);
    setIsSavingLayout(true);
    try {
      await saveCurrentPlaygroundLayout(nextLayout);
      const resolvedFigures = await collectionFiguresForLayout(collection, nextLayout);
      setLayout(nextLayout);
      setFigures(resolvedFigures);
    } catch {
      setActionError(true);
    } finally {
      setIsSavingLayout(false);
    }
  };

  const addToStage = (id: string): void => {
    if (!layout || layout.savedFigureIds.includes(id) || layout.savedFigureIds.length >= PLAYGROUND_LAYOUT_MAX_FIGURES) return;
    void updateLayout(createPlaygroundLayout([...layout.savedFigureIds, id]));
  };

  const removeFromStage = (id: string): void => {
    if (!layout || !layout.savedFigureIds.includes(id)) return;
    void updateLayout(createPlaygroundLayout(layout.savedFigureIds.filter((figureId) => figureId !== id)));
  };

  const moveOnStage = (id: string, direction: -1 | 1): void => {
    if (!layout) return;
    const index = layout.savedFigureIds.indexOf(id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= layout.savedFigureIds.length) return;
    const ids = [...layout.savedFigureIds];
    const current = ids[index];
    const target = ids[targetIndex];
    if (!current || !target) return;
    ids[index] = target;
    ids[targetIndex] = current;
    void updateLayout(createPlaygroundLayout(ids));
  };

  const stageIds = new Set(layout?.savedFigureIds ?? []);

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
              <h2 id="collection-stage-title">{t("collection.stageTitle")}</h2>
            </div>
            <span className="collection-page__stage-count">
              {t("collection.stageCount", { count: layout?.savedFigureIds.length ?? 0, max: PLAYGROUND_LAYOUT_MAX_FIGURES })}
            </span>
          </header>
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
                  const stageIndex = layout?.savedFigureIds.indexOf(saved.id) ?? -1;
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
                        onStage: t("collection.onStage"),
                        partCount: t("collection.partCount", { count: saved.document.selections.length }),
                        savedAt: t("collection.savedAt"),
                      }}
                      language={language}
                      onMove={(direction) => moveOnStage(saved.id, direction)}
                      onStage={onStage}
                      onToggleStage={() => onStage ? removeFromStage(saved.id) : addToStage(saved.id)}
                      saved={saved}
                      stageFull={(layout?.savedFigureIds.length ?? PLAYGROUND_LAYOUT_MAX_FIGURES) >= PLAYGROUND_LAYOUT_MAX_FIGURES}
                      stageIndex={stageIndex}
                      stageSize={layout?.savedFigureIds.length ?? 0}
                    />
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
