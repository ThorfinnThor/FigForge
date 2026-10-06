import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FigurePartsPanel } from "./FigurePartsPanel.js";
import { FigureViewport } from "./FigureViewport.js";
import { CatalogSetFilter, type CatalogSetSelection } from "./CatalogSetFilter.js";
import { PartCard } from "./PartCard.js";
import { ShopExportPanel } from "./ShopExportPanel.js";
import {
  CATALOG_CATEGORIES,
  builderComponentForCatalogPart,
  builderComponentForId,
  digitalConnectivityForComponent,
  digitallySupportedLDrawEntryForComponent,
  hasExactPrintedGeometry,
  loadCatalogParts,
  referenceVariant,
  thumbnailForComponent,
  verifiedLDrawEntryForComponent,
  type CatalogCategory,
} from "./catalog-workspace-data.js";
import { Button } from "./ui/Button.js";
import { StatusMessage } from "./ui/StatusMessage.js";
import { TextInput } from "./ui/TextInput.js";
import { mergeSemanticCatalogResults, searchCatalog } from "../search/catalog-search.js";
import {
  SemanticSearchClient,
  semanticSearchRelease,
} from "../search/semantic-search-client.js";
import { FIGURE_DOCUMENT_MAX_BYTES, type FigureDocument, type FigureDocumentSlot } from "../contracts/figure-document.js";
import {
  colorsFromFigureDocument,
  createFigureDocument,
  parseFigureDocument,
  selectionsFromFigureDocument,
  serializeFigureDocument,
} from "../figure/figure-document.js";
import { createFigureShareLink, hasFigureShareLink, parseFigureShareLink } from "../figure/share-link.js";
import {
  clearLocalFigureData,
  deleteSavedFigure,
  listSavedFigures,
  loadCurrentFigureDraft,
  saveCurrentFigureDraft,
  saveFigureToCollection,
  type SavedFigure,
} from "../storage/figure-draft-store.js";
import type { CatalogPackagePart } from "../contracts/catalog-package.js";
import type { LDrawCatalogRole, LDrawCatalogSelection } from "../scene/types.js";
import { useI18n } from "../i18n.js";
import type { ShopExportSelection } from "../procurement/shop-export.js";
import { loadShopExportLookup } from "../procurement/shop-export-data.js";
import type { ShopExportColor } from "../contracts/shop-export.js";

type MobileTab = "parts" | "figure" | "list";
type CatalogRole = CatalogPackagePart["role"];
type CatalogLoadState = "loading" | "ready" | "error";
type CatalogViewMode = "exact" | "all";
type SemanticSearchStatus = "disabled" | "loading" | "ready" | "error";
type FigureSnapshot = {
  selectedByRole: Partial<Record<CatalogRole, string>>;
  selectedColorByRole: Partial<Record<CatalogRole, number>>;
};

const INITIAL_VISIBLE_PARTS = 80;
const LDRAW_CATALOG_ROLES: ReadonlySet<string> = new Set([
  "head",
  "headwear",
  "torsoAssembly",
  "legsAssembly",
  "handAccessory",
]);

const initialSelectionByRole = (): Partial<Record<CatalogRole, string>> => referenceVariant
  ? {
    head: referenceVariant.headId,
    headwear: referenceVariant.headwearId,
    handAccessory: referenceVariant.handAccessoryId,
  }
  : {};

const isLDrawCatalogRole = (role: string): role is LDrawCatalogRole =>
  LDRAW_CATALOG_ROLES.has(role);

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => (
    typeof window !== "undefined" && window.matchMedia(query).matches
  ));

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export function CatalogWorkspace() {
  const { language, setLanguage, t } = useI18n();
  const [activeCategory, setActiveCategory] = useState<CatalogCategory>("head");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [catalogParts, setCatalogParts] = useState<readonly CatalogPackagePart[]>([]);
  const [catalogLoadState, setCatalogLoadState] = useState<CatalogLoadState>("loading");
  const [catalogViewMode, setCatalogViewMode] = useState<CatalogViewMode>("exact");
  const [selectedCatalogSet, setSelectedCatalogSet] = useState<CatalogSetSelection | null>(null);
  const [visiblePartCount, setVisiblePartCount] = useState(INITIAL_VISIBLE_PARTS);
  const [mobileTab, setMobileTab] = useState<MobileTab>("parts");
  const [isFigurePanelOpen, setIsFigurePanelOpen] = useState(false);
  const [selectedByRole, setSelectedByRole] = useState(initialSelectionByRole);
  const [selectedColorByRole, setSelectedColorByRole] = useState<Partial<Record<CatalogRole, number>>>({});
  const [undoSnapshot, setUndoSnapshot] = useState<FigureSnapshot | null>(null);
  const [colorOptionsByRole, setColorOptionsByRole] = useState<Partial<Record<CatalogRole, readonly ShopExportColor[]>>>({});
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"loading" | "saved" | "error">("loading");
  const [savedFigures, setSavedFigures] = useState<readonly SavedFigure[]>([]);
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const [transferMessageTone, setTransferMessageTone] = useState<"danger" | "info">("info");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [semanticStatus, setSemanticStatus] = useState<SemanticSearchStatus>("loading");
  const [semanticProgress, setSemanticProgress] = useState({ loaded: 0, total: semanticSearchRelease.requiredDownloadBytes });
  const [semanticHits, setSemanticHits] = useState<Array<{ componentId: string; score: number }>>([]);
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticSearching, setSemanticSearching] = useState(false);
  const semanticClientRef = useRef<SemanticSearchClient | null>(null);
  const semanticRequestRef = useRef(0);
  const isMobileLayout = useMediaQuery("(max-width: 767px)");
  const isDesktopDrawerLayout = useMediaQuery("(min-width: 768px)");
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const selectedSetPartNumbers = useMemo(
    () => selectedCatalogSet
      ? new Set(selectedCatalogSet.partNumbers.map((partNum) => partNum.toLocaleLowerCase("en-US")))
      : null,
    [selectedCatalogSet],
  );
  const catalogPartsForView = useMemo(
    () => catalogViewMode === "exact"
      ? catalogParts.filter((part) => {
        if (selectedSetPartNumbers
          && !selectedSetPartNumbers.has(part.rebrickablePartNum.toLocaleLowerCase("en-US"))) return false;
        const component = builderComponentForCatalogPart(part);
        return Boolean(component && hasExactPrintedGeometry(component.id));
      })
      : selectedSetPartNumbers
        ? catalogParts.filter((part) =>
          selectedSetPartNumbers.has(part.rebrickablePartNum.toLocaleLowerCase("en-US")))
        : catalogParts,
    [catalogParts, catalogViewMode, selectedSetPartNumbers],
  );
  const searchResult = useMemo(() => {
    const options = activeCategory === "all" ? undefined : { category: activeCategory };
    return semanticStatus === "ready" && semanticQuery === deferredQuery && deferredQuery.trim().length > 0
      ? mergeSemanticCatalogResults(catalogPartsForView, deferredQuery, semanticHits, options)
      : searchCatalog(catalogPartsForView, deferredQuery, options);
  }, [activeCategory, catalogPartsForView, deferredQuery, semanticHits, semanticQuery, semanticStatus]);
  const filteredComponents = searchResult.results.map(({ component }) => component);
  const visibleComponents = filteredComponents.slice(0, visiblePartCount);

  useEffect(() => {
    let active = true;
    setCatalogLoadState("loading");
    setCatalogParts([]);
    void loadCatalogParts(activeCategory)
      .then((parts) => {
        if (!active) return;
        setCatalogParts(parts);
        setCatalogLoadState("ready");
      })
      .catch(() => {
        if (active) setCatalogLoadState("error");
      });
    return () => { active = false; };
  }, [activeCategory]);

  useEffect(() => {
    let active = true;
    const client = new SemanticSearchClient();
    semanticClientRef.current = client;
    void client.initialize((loaded, total) => setSemanticProgress({ loaded, total }))
      .then(() => {
        if (!active) return;
        setSemanticStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error("Semantic search initialization failed", error);
        setSemanticStatus("error");
      });
    return () => {
      active = false;
      client.dispose();
    };
  }, []);

  useEffect(() => {
    if (semanticStatus !== "ready") return;
    if (deferredQuery.trim().length === 0) {
      setSemanticHits([]);
      setSemanticQuery("");
      setSemanticSearching(false);
      return;
    }
    const requestId = ++semanticRequestRef.current;
    setSemanticSearching(true);
    void semanticClientRef.current?.search(deferredQuery)
      .then((hits) => {
        if (requestId !== semanticRequestRef.current) return;
        setSemanticHits(hits);
        setSemanticQuery(deferredQuery);
      })
      .catch((error: unknown) => {
        console.error("Semantic search request failed", error);
        if (requestId === semanticRequestRef.current) setSemanticStatus("error");
      })
      .finally(() => {
        if (requestId === semanticRequestRef.current) setSemanticSearching(false);
      });
  }, [deferredQuery, semanticStatus]);

  const megabytes = (bytes: number): string => (bytes / 1_000_000).toLocaleString(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  useEffect(() => {
    setVisiblePartCount(INITIAL_VISIBLE_PARTS);
  }, [activeCategory, catalogViewMode, deferredQuery, selectedCatalogSet]);

  const selectedComponentIds = new Set(Object.values(selectedByRole));
  const figureSlot = (id: CatalogRole, label: string) => {
    const componentId = selectedByRole[id];
    const component = componentId ? builderComponentForId(componentId) : undefined;
    return {
      id,
      label,
      component,
      thumbnailUrl: component ? thumbnailForComponent(component) : undefined,
      colors: colorOptionsByRole[id] ?? [],
      selectedColorId: selectedColorByRole[id],
    };
  };
  const figureSlots = [
    figureSlot("head", t("figure.head")),
    figureSlot("headwear", t("figure.headwear")),
    figureSlot("torsoAssembly", t("figure.torsoAssembly")),
    figureSlot("legsAssembly", t("figure.legsAssembly")),
    figureSlot("handAccessory", t("figure.handAccessory")),
  ];
  const selectedLDrawParts = Object.entries(selectedByRole).flatMap(([role, componentId]) => {
    if (!componentId || !isLDrawCatalogRole(role)) {
      return [];
    }
    const component = builderComponentForId(componentId);
    const ldrawEntry = digitallySupportedLDrawEntryForComponent(componentId);
    const connectivity = digitalConnectivityForComponent(componentId);
    if (!component || !ldrawEntry || connectivity?.status !== "digitally-supported") {
      return [];
    }
    return [{
      componentId,
      label: component.name,
      ldrawFile: ldrawEntry.ldrawFile,
      ldrawUpdate: ldrawEntry.ldrawUpdate,
      modelUrl: ldrawEntry.modelUrl,
      placementMode: connectivity.placementMode,
      placementTransformLdu: connectivity.placementTransformLdu,
      rebrickablePartNum: component.rebrickablePartNum,
      role,
    } satisfies LDrawCatalogSelection];
  });

  // Shop lines use the real Rebrickable part number, also for parts shown as "Geometrie ohne Druck".
  const shopExportSelections = figureSlots.flatMap(({ id, component }) => component
    ? [{
      slot: id,
      name: component.name,
      rebrickablePartNum: component.rebrickablePartNum,
      ...(selectedColorByRole[id] === undefined ? {} : { rebrickableColorId: selectedColorByRole[id] }),
    } satisfies ShopExportSelection]
    : []);

  const rememberFigureState = (): void => {
    setUndoSnapshot({
      selectedByRole: { ...selectedByRole },
      selectedColorByRole: { ...selectedColorByRole },
    });
  };

  const selectForPreview = (component: CatalogPackagePart): void => {
    if (!digitallySupportedLDrawEntryForComponent(component.id)) {
      return;
    }
    if (selectedByRole[component.role] === component.id) return;
    rememberFigureState();
    setSelectedColorByRole((current) => {
      const next = { ...current };
      delete next[component.role];
      return next;
    });
    setSelectedByRole((current) => ({ ...current, [component.role]: component.id }));
  };

  const removeFromFigure = (slot: CatalogRole): void => {
    if (!selectedByRole[slot]) return;
    rememberFigureState();
    setSelectedByRole((current) => {
      const next = { ...current };
      delete next[slot];
      return next;
    });
    setSelectedColorByRole((current) => {
      const next = { ...current };
      delete next[slot];
      return next;
    });
  };

  const changeSelectedColor = (slot: CatalogRole, colorId: number | undefined): void => {
    if (selectedColorByRole[slot] === colorId) return;
    rememberFigureState();
    setSelectedColorByRole((current) => {
      const next = { ...current };
      if (colorId === undefined) delete next[slot];
      else next[slot] = colorId;
      return next;
    });
  };

  const undoLastFigureChange = (): void => {
    if (!undoSnapshot) return;
    setSelectedByRole({ ...undoSnapshot.selectedByRole });
    setSelectedColorByRole({ ...undoSnapshot.selectedColorByRole });
    setUndoSnapshot(null);
  };

  const showAllPartsForSelectedSet = (): void => {
    setActiveCategory("all");
    setCatalogViewMode("all");
    setQuery("");
  };

  const isSupportedDocumentSelection = (componentId: string, slot: FigureDocumentSlot): boolean => {
    const component = builderComponentForId(componentId);
    return component?.role === slot && Boolean(digitallySupportedLDrawEntryForComponent(componentId));
  };

  useEffect(() => {
    let active = true;
    const selected = Object.entries(selectedByRole).flatMap(([slot, componentId]) => {
      const component = componentId ? builderComponentForId(componentId) : undefined;
      return component ? [{ slot: slot as CatalogRole, component }] : [];
    });
    if (selected.length === 0) {
      setColorOptionsByRole({});
      setSelectedColorByRole({});
      return () => { active = false; };
    }
    void loadShopExportLookup(selected.map(({ slot }) => slot)).then((lookup) => {
      if (!active) return;
      const options = Object.fromEntries(selected.map(({ component, slot }) => [
        slot,
        lookup(slot, component.rebrickablePartNum)?.colors ?? [],
      ])) as Partial<Record<CatalogRole, readonly ShopExportColor[]>>;
      setColorOptionsByRole(options);
      setSelectedColorByRole((current) => Object.fromEntries(selected.flatMap(({ slot }) => {
        const colors = options[slot] ?? [];
        const existing = current[slot];
        if (existing !== undefined && colors.some(({ rebrickableColorId }) => rebrickableColorId === existing)) {
          return [[slot, existing]];
        }
        return colors.length === 1 ? [[slot, colors[0]!.rebrickableColorId]] : [];
      })));
    }).catch(() => {
      if (active) setColorOptionsByRole({});
    });
    return () => { active = false; };
  }, [selectedByRole]);

  const restoreFigureDocument = async (document: FigureDocument, recordUndo = true): Promise<void> => {
    const roles = [...new Set(document.selections.map(({ slot }) => slot))];
    await Promise.all(roles.map(loadCatalogParts));
    const restored = selectionsFromFigureDocument(document, isSupportedDocumentSelection);
    if (Object.keys(restored).length !== document.selections.length) throw new Error("unsupported");
    const lookup = await loadShopExportLookup(roles);
    const restoredColors = colorsFromFigureDocument(document, (componentId, slot, colorId) => {
      const component = builderComponentForId(componentId);
      return Boolean(component && lookup(slot, component.rebrickablePartNum)?.colors
        .some(({ rebrickableColorId }) => rebrickableColorId === colorId));
    });
    const declaredColorCount = document.selections.filter(({ rebrickableColorId }) => rebrickableColorId !== undefined).length;
    if (Object.keys(restoredColors).length !== declaredColorCount) throw new Error("unsupported-color");
    if (recordUndo) rememberFigureState();
    setSelectedByRole(restored);
    setSelectedColorByRole(restoredColors);
  };

  const currentFigureDocument = (): FigureDocument => createFigureDocument(
    selectedByRole,
    t("figure.defaultName"),
    undefined,
    selectedColorByRole,
  );

  useEffect(() => {
    let active = true;
    void Promise.all([loadCurrentFigureDraft(), listSavedFigures()])
      .then(async ([document, collection]) => {
        if (!active) return;
        setSavedFigures(collection);
        let shared: ReturnType<typeof parseFigureShareLink> | null = null;
        if (hasFigureShareLink(window.location.href)) {
          try {
            shared = parseFigureShareLink(window.location.href);
          } catch {
            setTransferMessageTone("danger");
            setTransferMessage(t("figure.share.invalid"));
          }
        }
        const initialDocument = shared ?? document;
        if (!initialDocument) return;
        if (!active) return;
        await restoreFigureDocument(initialDocument, false);
        setUndoSnapshot(null);
        if (shared) {
          setTransferMessageTone("info");
          setTransferMessage(t("figure.share.loaded", { name: initialDocument.name }));
        }
      })
      .catch(() => {
        if (active) setSaveStatus("error");
      })
      .finally(() => {
        if (active) {
          setDraftHydrated(true);
          void listSavedFigures().then(setSavedFigures).catch(() => undefined);
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    const timeout = window.setTimeout(() => {
      setSaveStatus("loading");
      void saveCurrentFigureDraft(currentFigureDocument())
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [draftHydrated, selectedByRole, selectedColorByRole]);

  useEffect(() => {
    setShareLink(null);
  }, [selectedByRole, selectedColorByRole]);

  const exportFigure = (): void => {
    const content = serializeFigureDocument(currentFigureDocument());
    const url = URL.createObjectURL(new Blob([content], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "figforge-figur.json";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setTransferMessageTone("info");
    setTransferMessage(t("figure.transfer.exported"));
  };

  const importFigure = async (file: File): Promise<void> => {
    try {
      if (file.size > FIGURE_DOCUMENT_MAX_BYTES) {
        throw new Error("file-too-large");
      }
      const document = parseFigureDocument(await file.text());
      await restoreFigureDocument(document);
      setTransferMessageTone("info");
      setTransferMessage(t("figure.transfer.loaded", { name: document.name }));
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : "invalid";
      const messageKey = errorCode === "file-too-large"
        ? "figure.transfer.fileTooLarge"
        : errorCode === "unsupported" || errorCode === "unsupported-color"
          ? "figure.transfer.unsupported"
          : "figure.transfer.invalid";
      setTransferMessageTone("danger");
      setTransferMessage(`${t("figure.transfer.errorPrefix")}: ${t(messageKey)}`);
    }
  };

  const shareFigure = async (): Promise<void> => {
    try {
      const link = createFigureShareLink(currentFigureDocument(), window.location.href);
      setShareLink(link);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        setTransferMessageTone("info");
        setTransferMessage(t("figure.share.copied"));
      } else {
        setTransferMessageTone("info");
        setTransferMessage(t("figure.share.ready"));
      }
    } catch {
      setTransferMessageTone("danger");
      setTransferMessage(`${t("figure.transfer.errorPrefix")}: ${t("figure.share.error")}`);
    }
  };

  const saveToCollection = async (): Promise<void> => {
    try {
      await saveFigureToCollection(currentFigureDocument());
      setSavedFigures(await listSavedFigures());
      setTransferMessageTone("info");
      setTransferMessage(t("figure.collection.saved"));
    } catch {
      setTransferMessageTone("danger");
      setTransferMessage(t("figure.collection.error"));
    }
  };

  const loadFromCollection = async (saved: SavedFigure): Promise<void> => {
    try {
      await restoreFigureDocument(saved.document);
      setTransferMessageTone("info");
      setTransferMessage(t("figure.collection.loaded", { name: saved.document.name }));
    } catch {
      setTransferMessageTone("danger");
      setTransferMessage(t("figure.transfer.unsupported"));
    }
  };

  const removeFromCollection = async (id: string): Promise<void> => {
    try {
      await deleteSavedFigure(id);
      setSavedFigures(await listSavedFigures());
    } catch {
      setTransferMessageTone("danger");
      setTransferMessage(t("figure.collection.error"));
    }
  };

  const clearLocalData = async (): Promise<void> => {
    if (!window.confirm(t("figure.collection.clearConfirm"))) return;
    try {
      await clearLocalFigureData();
      setSavedFigures([]);
      setTransferMessageTone("info");
      setTransferMessage(t("figure.collection.cleared"));
    } catch {
      setTransferMessageTone("danger");
      setTransferMessage(t("figure.collection.error"));
    }
  };

  useEffect(() => {
    if (!isDesktopDrawerLayout) {
      setIsFigurePanelOpen(false);
    }
  }, [isDesktopDrawerLayout]);

  const closeFigurePanel = () => {
    setIsFigurePanelOpen(false);
    requestAnimationFrame(() => drawerTriggerRef.current?.focus());
  };

  useEffect(() => {
    if (!isDesktopDrawerLayout || !isFigurePanelOpen) {
      return;
    }

    requestAnimationFrame(() => drawerCloseRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFigurePanelOpen(false);
        requestAnimationFrame(() => drawerTriggerRef.current?.focus());
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isDesktopDrawerLayout, isFigurePanelOpen]);

  const categoryRail = (
    <aside className="category-rail" aria-label={t("categories.title")}>
      <p className="category-rail__title">{t("categories.title")}</p>
      {CATALOG_CATEGORIES.map((category) => (
        <Button
          aria-label={`${t(`category.${category.id}`)} ${t("category.filter")}`}
          aria-pressed={activeCategory === category.id}
          className="category-rail__button"
          data-category={category.id}
          key={category.id}
          onClick={() => setActiveCategory(category.id)}
          size="sm"
          title={t(`category.${category.id}`)}
          variant="ghost"
        >
          {t(`category.${category.id}`)}
        </Button>
      ))}
    </aside>
  );

  const catalogPanel = (
    <section className="catalog-panel" aria-labelledby="catalog-heading">
      <div className="catalog-panel__header">
        <p className="eyebrow">{t("catalog.eyebrow")}</p>
        <h1 id="catalog-heading">{t("catalog.heading")}</h1>
        <p className="lede">{t("catalog.lede")}</p>
      </div>
      <div className="catalog-search-sticky">
        <TextInput
          label={t("catalog.searchLabel")}
          placeholder={t("catalog.searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          hint={catalogLoadState === "ready"
            ? t(deferredQuery.trim().length === 0
              ? "catalog.results.all"
              : searchResult.outcome === "direct"
                ? "catalog.results.direct"
                : searchResult.outcome === "suggestions"
                  ? "catalog.results.suggestions"
                  : "catalog.results.none", { shown: filteredComponents.length, total: catalogPartsForView.length })
            : t("catalog.loadingHint")}
        />
        {semanticStatus !== "ready" || semanticSearching ? (
          <div className="semantic-search-controls" data-status={semanticStatus}>
            {semanticStatus === "loading" ? (
              <span role="status">{t("search.semantic.loading", {
                loadedMB: megabytes(semanticProgress.loaded),
                totalMB: megabytes(semanticProgress.total),
              })}</span>
            ) : null}
            {semanticStatus === "ready" && semanticSearching ? <span role="status">{t("search.semantic.searching")}</span> : null}
            {semanticStatus === "error" ? <span className="semantic-search-error">{t("search.semantic.error")}</span> : null}
          </div>
        ) : null}
      </div>
      {categoryRail}
      <details className="catalog-toolbar">
        <summary className="catalog-toolbar__summary">
          <span>{t("catalog.filters.title")}</span>
          <small>
            {t(`category.${activeCategory}`)} · {t(catalogViewMode === "exact" ? "catalog.mode.exact" : "catalog.mode.all")}
            {selectedCatalogSet ? ` · ${selectedCatalogSet.setNum}` : ""}
          </small>
        </summary>
        <div className="catalog-toolbar__body" aria-label={t("catalog.categoryFilter")}>
          <div className="catalog-toolbar__controls">
            <label className="catalog-toolbar__view">
              <span>{t("catalog.mode.label")}</span>
              <select
                aria-label={t("catalog.showMode")}
                value={catalogViewMode}
                onChange={(event) => setCatalogViewMode(event.currentTarget.value as CatalogViewMode)}
              >
                <option value="exact">{t("catalog.mode.exact")}</option>
                <option value="all">{t("catalog.mode.all")}</option>
              </select>
            </label>
          </div>
          <p className="catalog-toolbar__mode">
            {catalogViewMode === "exact" ? t("catalog.mode.exactHint") : t("catalog.mode.allHint")}
          </p>
          <CatalogSetFilter onChange={setSelectedCatalogSet} selected={selectedCatalogSet} />
          <p className="catalog-toolbar__policy">
            <span aria-hidden="true">✓</span>
            {t("catalog.policy")}
          </p>
        </div>
      </details>
      {searchResult.query.warnings.length > 0 || searchResult.query.unknownTerms.length > 0 ? (
        <StatusMessage className="search-status" tone="warning">
           {searchResult.query.warnings.map((warning) => {
             if (language === "de") return warning;
             if (warning.includes("Mehrere Kategorien")) return t("search.categoryConflict");
             if (warning.includes("Schild")) return t("search.ambiguousShield");
             return warning;
           }).join(" ")}
          {searchResult.query.unknownTerms.length > 0
            ? ` ${t("catalog.unknownTerms", { terms: searchResult.query.unknownTerms.join(", ") })}`
            : ""}
        </StatusMessage>
      ) : null}
      {deferredQuery.trim().length > 0 && searchResult.outcome === "suggestions" ? (
        <StatusMessage className="search-status" tone="info">
          {t("catalog.suggestionsNotice")}
        </StatusMessage>
      ) : null}
      {catalogLoadState === "loading" ? (
        <StatusMessage tone="info">{t("catalog.loading")}</StatusMessage>
      ) : catalogLoadState === "error" ? (
        <StatusMessage tone="danger">
          {t("catalog.loadError")}
        </StatusMessage>
      ) : filteredComponents.length > 0 ? (
        <>
        <div className="part-grid">
          {visibleComponents.map((component) => {
            const builderComponent = builderComponentForCatalogPart(component);
            const builderComponentId = builderComponent?.id;
            return (
              <PartCard
                builderComponentId={builderComponentId}
                component={component}
                geometryOnlyPreview={Boolean(builderComponentId
                  && verifiedLDrawEntryForComponent(builderComponentId)?.geometryFallback)}
                key={`${component.role}:${component.rebrickablePartNum}`}
                ldrawAvailable={Boolean(builderComponentId && verifiedLDrawEntryForComponent(builderComponentId))}
                connectionStatus={builderComponentId
                  ? digitalConnectivityForComponent(builderComponentId)?.status
                  : undefined}
                onSelect={builderComponent && digitallySupportedLDrawEntryForComponent(builderComponent.id)
                  ? () => selectForPreview(builderComponent)
                  : undefined}
                selected={Boolean(builderComponentId && selectedComponentIds.has(builderComponentId))}
                thumbnailUrl={builderComponent ? thumbnailForComponent(builderComponent) : undefined}
              />
            );
          })}
        </div>
        {visibleComponents.length < filteredComponents.length ? (
          <Button
            className="catalog-load-more"
            onClick={() => setVisiblePartCount((count) => count + INITIAL_VISIBLE_PARTS)}
            variant="secondary"
          >
            {t("catalog.loadMore", { shown: visibleComponents.length, total: filteredComponents.length })}
          </Button>
        ) : null}
        </>
      ) : selectedCatalogSet ? (
        <div className="catalog-set-zero">
          <StatusMessage tone="warning">
            {t("catalog.setFilter.zeroFiltered", {
              count: selectedCatalogSet.partNumbers.length,
              filters: [
                t(`category.${activeCategory}`),
                t(catalogViewMode === "exact" ? "catalog.mode.exact" : "catalog.mode.all"),
                ...(deferredQuery.trim().length > 0
                  ? [t("catalog.setFilter.queryContext", { query: deferredQuery.trim() })]
                  : []),
              ].join(" · "),
              set: `${selectedCatalogSet.setNum} · ${selectedCatalogSet.name}`,
            })}
          </StatusMessage>
          <Button onClick={showAllPartsForSelectedSet} variant="secondary">
            {t("catalog.setFilter.showAll")}
          </Button>
        </div>
      ) : (
        <StatusMessage tone="warning">{t("catalog.noResults")}</StatusMessage>
      )}
    </section>
  );

  const viewport = (
    <section className="workspace-viewport" aria-label={t("mobile.figure")}>
      <FigureViewport selectedParts={selectedLDrawParts} />
    </section>
  );

  const figurePanel = (
    <FigurePartsPanel
      closeButtonRef={drawerCloseRef}
      drawer={isDesktopDrawerLayout}
      onClose={closeFigurePanel}
      onExport={exportFigure}
      onShare={shareFigure}
      onImport={importFigure}
      onSaveToCollection={saveToCollection}
      onLoadFromCollection={loadFromCollection}
      onDeleteFromCollection={removeFromCollection}
      onClearLocalData={clearLocalData}
      saveStatus={saveStatus}
      savedFigures={savedFigures}
      shareLink={shareLink}
      shopExport={<ShopExportPanel selections={shopExportSelections} />}
      slots={figureSlots}
      onColorChange={changeSelectedColor}
      onRemove={removeFromFigure}
      transferMessage={transferMessage}
      transferMessageTone={transferMessageTone}
    />
  );

  return (
    <div className="app-shell" id="builder">
      <header className="app-header">
        <a className="wordmark" href="/">Fig<span>Forge</span></a>
         <nav className="app-nav" aria-label={t("nav.label")}>
          <a className="app-nav__link app-nav__link--active" href="/" aria-current="page">{t("nav.builder")}</a>
          <a className="app-nav__link" href="/methodology">{t("nav.notes")}</a>
        </nav>
        <span className="app-header__status">{t("header.status")}</span>
        <label className="language-picker">
          <span>{t("language.label")}</span>
          <select aria-label={t("language.label")} value={language} onChange={(event) => setLanguage(event.currentTarget.value as "de" | "en")}>
            <option value="de">{t("language.de")}</option>
            <option value="en">{t("language.en")}</option>
          </select>
        </label>
        <Button
          aria-label={undoSnapshot ? t("figure.undo") : t("figure.undoUnavailable")}
          className="workspace-undo"
          disabled={!undoSnapshot}
          onClick={undoLastFigureChange}
          size="sm"
          title={undoSnapshot ? t("figure.undo") : t("figure.undoUnavailable")}
          variant="ghost"
        >
          <span aria-hidden="true">↶</span>
          <span>{t("figure.undo")}</span>
        </Button>
        {!isMobileLayout ? (
          <button
            aria-expanded={isFigurePanelOpen}
            className="ff-button ff-button--secondary ff-button--sm workspace-drawer-trigger"
            onClick={() => setIsFigurePanelOpen(true)}
            ref={drawerTriggerRef}
            type="button"
          >
            {t("header.openFigureCount", { count: selectedComponentIds.size })}
          </button>
        ) : null}
      </header>

      {isMobileLayout ? (
         <div className="mobile-workspace" aria-label={t("mobile.workspaceLabel")}>
           <div className="mobile-tabs" role="tablist" aria-label={t("mobile.tabsLabel")}>
            {([
              ["parts", t("mobile.parts")],
              ["figure", t("mobile.figure")],
              ["list", t("mobile.list")],
            ] as const).map(([tab, label]) => (
              <button
                aria-controls={`mobile-panel-${tab}`}
                aria-selected={mobileTab === tab}
                className="mobile-tab"
                id={`mobile-tab-${tab}`}
                key={tab}
                onClick={() => setMobileTab(tab)}
                role="tab"
                tabIndex={mobileTab === tab ? 0 : -1}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          {mobileTab === "parts" ? (
            <div className="mobile-tab-panel mobile-parts-panel" id="mobile-panel-parts" role="tabpanel" aria-labelledby="mobile-tab-parts">
              {catalogPanel}
            </div>
          ) : null}
          {mobileTab === "figure" ? (
            <div className="mobile-tab-panel" id="mobile-panel-figure" role="tabpanel" aria-labelledby="mobile-tab-figure">
              {viewport}
            </div>
          ) : null}
          {mobileTab === "list" ? (
            <div className="mobile-tab-panel" id="mobile-panel-list" role="tabpanel" aria-labelledby="mobile-tab-list">
              {figurePanel}
            </div>
          ) : null}
        </div>
      ) : (
         <div className="workspace" aria-label={t("mobile.workspaceLabel")}>
          {catalogPanel}
          {viewport}
          {isDesktopDrawerLayout && isFigurePanelOpen ? (
          <button aria-label={t("figure.panelClose")} className="figure-panel-backdrop" onClick={closeFigurePanel} type="button" />
          ) : null}
          {isFigurePanelOpen ? figurePanel : null}
        </div>
      )}

    </div>
  );
}
