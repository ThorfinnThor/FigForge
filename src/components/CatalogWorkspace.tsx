import { useDeferredValue, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { AppHeader } from "./AppHeader.js";
import { FigurePartsPanel } from "./FigurePartsPanel.js";
import { FigureViewport } from "./FigureViewport.js";
import { CatalogSetFilter, type CatalogSetSelection } from "./CatalogSetFilter.js";
import { PartCard } from "./PartCard.js";
import { ShopExportPanel } from "./ShopExportPanel.js";
import { SaveToCollectionDialog } from "./SaveToCollectionDialog.js";
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
} from "../figure/figure-document.js";
import { downloadFigureDocument } from "../figure/download-figure-document.js";
import { createFigureShareLink, hasFigureShareLink, parseFigureShareLink } from "../figure/share-link.js";
import { consumedFigureImportPath } from "../figure/import-location.js";
import { figureTemplateForId } from "../ideas/figure-templates.js";
import {
  defaultFigureDocument,
  defaultFigureSelections,
  isUntouchedLegacyDefault,
} from "../figure/default-figure.js";
import {
  listSavedFigures,
  loadCurrentFigureDraft,
  saveCurrentFigureDraft,
  saveFigureToCollection,
} from "../storage/figure-draft-store.js";
import type { CatalogPackagePart } from "../contracts/catalog-package.js";
import type { LDrawCatalogRole, LDrawCatalogSelection } from "../scene/types.js";
import { useI18n } from "../i18n.js";
import type { ShopExportSelection } from "../procurement/shop-export.js";
import { loadShopExportLookup } from "../procurement/shop-export-data.js";
import type { ShopExportColor } from "../contracts/shop-export.js";
import { MOBILE_TAB_ORDER, mobileTabForKey, type MobileTab } from "./mobile-tab-navigation.js";

type CatalogRole = CatalogPackagePart["role"];
type CatalogLoadState = "loading" | "ready" | "error";
type CatalogViewMode = "exact" | "all";
type SemanticSearchStatus = "disabled" | "loading" | "ready" | "error";
type DraftHydrationState = "loading" | "ready" | "recovery-required";
type FigureSnapshot = {
  selectedByRole: Partial<Record<CatalogRole, string>>;
  selectedColorByRole: Partial<Record<CatalogRole, number>>;
};

const DESKTOP_VISIBLE_PARTS_BATCH = 80;
const MOBILE_VISIBLE_PARTS_BATCH = 24;
const MAX_UNDO_HISTORY = 50;
const RESTORE_SUPERSEDED_ERROR = "restore-superseded";
const LDRAW_CATALOG_ROLES: ReadonlySet<string> = new Set([
  "head",
  "headwear",
  "torsoAssembly",
  "legsAssembly",
  "handAccessory",
]);

const initialSelectionByRole = (): Partial<Record<CatalogRole, string>> => defaultFigureSelections();

const LEGACY_DEFAULT_COMPONENT_IDS: ReadonlySet<string> = new Set(referenceVariant
  ? [
    referenceVariant.headId,
    referenceVariant.headwearId,
    referenceVariant.torsoAssemblyId,
    referenceVariant.legsAssemblyId,
    referenceVariant.handAccessoryId,
  ]
  : []);

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

const initialVisiblePartCount = (): number => (
  typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
    ? MOBILE_VISIBLE_PARTS_BATCH
    : DESKTOP_VISIBLE_PARTS_BATCH
);

export function CatalogWorkspace() {
  const { language, t } = useI18n();
  const [activeCategory, setActiveCategory] = useState<CatalogCategory>("head");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [catalogParts, setCatalogParts] = useState<readonly CatalogPackagePart[]>([]);
  const [catalogLoadState, setCatalogLoadState] = useState<CatalogLoadState>("loading");
  const [catalogLoadRevision, setCatalogLoadRevision] = useState(0);
  const [catalogViewMode, setCatalogViewMode] = useState<CatalogViewMode>("exact");
  const [selectedCatalogSet, setSelectedCatalogSet] = useState<CatalogSetSelection | null>(null);
  const [visiblePartCount, setVisiblePartCount] = useState(initialVisiblePartCount);
  const [mobileTab, setMobileTab] = useState<MobileTab>("parts");
  const [openedMobileTabs, setOpenedMobileTabs] = useState<ReadonlySet<MobileTab>>(() => new Set(["parts"]));
  const [isFigurePanelOpen, setIsFigurePanelOpen] = useState(false);
  const [selectedByRole, setSelectedByRole] = useState(initialSelectionByRole);
  const [selectedColorByRole, setSelectedColorByRole] = useState<Partial<Record<CatalogRole, number>>>({});
  const [figureName, setFigureName] = useState(() => t("figure.defaultName"));
  const [undoHistory, setUndoHistory] = useState<FigureSnapshot[]>([]);
  const [colorOptionsByRole, setColorOptionsByRole] = useState<Partial<Record<CatalogRole, readonly ShopExportColor[]>>>({});
  const [draftHydrationState, setDraftHydrationState] = useState<DraftHydrationState>("loading");
  const [draftHydrationRevision, setDraftHydrationRevision] = useState(0);
  const [draftPersistencePaused, setDraftPersistencePaused] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"loading" | "saved" | "error">("loading");
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const [transferMessageTone, setTransferMessageTone] = useState<"danger" | "info">("info");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [semanticStatus, setSemanticStatus] = useState<SemanticSearchStatus>("disabled");
  const [semanticSearchEnabled, setSemanticSearchEnabled] = useState(false);
  const [semanticClientRevision, setSemanticClientRevision] = useState(0);
  const [semanticProgress, setSemanticProgress] = useState({ loaded: 0, total: semanticSearchRelease.requiredDownloadBytes });
  const [semanticHits, setSemanticHits] = useState<Array<{ componentId: string; score: number }>>([]);
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticSearching, setSemanticSearching] = useState(false);
  const semanticClientRef = useRef<SemanticSearchClient | null>(null);
  const semanticRequestRef = useRef(0);
  const restoreOperationRef = useRef(0);
  const draftWriteRevisionRef = useRef(0);
  const collectionSavePendingRef = useRef(false);
  const previewCaptureRef = useRef<(() => string) | null>(null);
  const [collectionSavePending, setCollectionSavePending] = useState(false);
  const [collectionSaveDialogOpen, setCollectionSaveDialogOpen] = useState(false);
  const [collectionSaveResult, setCollectionSaveResult] = useState<"idle" | "saved" | "error">("idle");
  const [previewSynchronized, setPreviewSynchronized] = useState(false);
  const isMobileLayout = useMediaQuery("(max-width: 767px)");
  const isDesktopDrawerLayout = useMediaQuery("(min-width: 768px)");
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const purchaseSectionRef = useRef<HTMLElement>(null);
  const [purchaseFlowRequested, setPurchaseFlowRequested] = useState(false);
  const mobileTabRefs = useRef(new Map<MobileTab, HTMLButtonElement>());
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
  }, [activeCategory, catalogLoadRevision]);

  useEffect(() => {
    if (!semanticSearchEnabled) return;
    let active = true;
    setSemanticStatus("loading");
    setSemanticProgress({ loaded: 0, total: semanticSearchRelease.requiredDownloadBytes });
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
  }, [semanticClientRevision, semanticSearchEnabled]);

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
    setVisiblePartCount(isMobileLayout ? MOBILE_VISIBLE_PARTS_BATCH : DESKTOP_VISIBLE_PARTS_BATCH);
  }, [activeCategory, catalogViewMode, deferredQuery, isMobileLayout, selectedCatalogSet]);

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
    const snapshot = {
      selectedByRole: { ...selectedByRole },
      selectedColorByRole: { ...selectedColorByRole },
    };
    setUndoHistory((current) => [...current, snapshot].slice(-MAX_UNDO_HISTORY));
  };

  const markFigureEdited = (): void => {
    restoreOperationRef.current += 1;
    setDraftPersistencePaused(false);
    setSaveStatus("loading");
  };

  const selectForPreview = (component: CatalogPackagePart): void => {
    if (!digitallySupportedLDrawEntryForComponent(component.id)) {
      return;
    }
    if (selectedByRole[component.role] === component.id) return;
    markFigureEdited();
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
    markFigureEdited();
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
    markFigureEdited();
    rememberFigureState();
    setSelectedColorByRole((current) => {
      const next = { ...current };
      if (colorId === undefined) delete next[slot];
      else next[slot] = colorId;
      return next;
    });
  };

  const undoLastFigureChange = (): void => {
    const snapshot = undoHistory.at(-1);
    if (!snapshot) return;
    markFigureEdited();
    setSelectedByRole({ ...snapshot.selectedByRole });
    setSelectedColorByRole({ ...snapshot.selectedColorByRole });
    setUndoHistory((current) => current.slice(0, -1));
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

  /**
   * Strict by default: imports and share links with unknown parts are rejected, never
   * silently replaced. `lenient` is only for the user's own stored draft, where parts
   * that are no longer available are dropped so the rest of the draft still opens.
   * Returns how many parts were dropped.
   */
  const restoreFigureDocument = async (
    document: FigureDocument,
    recordUndo = true,
    operation = restoreOperationRef.current + 1,
    lenient = false,
  ): Promise<number> => {
    restoreOperationRef.current = operation;
    const roles = [...new Set(document.selections.map(({ slot }) => slot))];
    await Promise.all(roles.map(loadCatalogParts));
    if (restoreOperationRef.current !== operation) throw new Error(RESTORE_SUPERSEDED_ERROR);
    const restored = selectionsFromFigureDocument(document, isSupportedDocumentSelection);
    const droppedCount = document.selections.length - Object.keys(restored).length;
    if (droppedCount > 0 && !lenient) throw new Error("unsupported");
    const lookup = await loadShopExportLookup(roles);
    if (restoreOperationRef.current !== operation) throw new Error(RESTORE_SUPERSEDED_ERROR);
    const restoredColors = colorsFromFigureDocument(document, (componentId, slot, colorId) => {
      const component = builderComponentForId(componentId);
      return Boolean(component && lookup(slot, component.rebrickablePartNum)?.colors
        .some(({ rebrickableColorId }) => rebrickableColorId === colorId));
    });
    const declaredColorCount = document.selections
      .filter(({ rebrickableColorId, slot }) => rebrickableColorId !== undefined && restored[slot] !== undefined)
      .length;
    if (!lenient && Object.keys(restoredColors).length !== declaredColorCount) throw new Error("unsupported-color");
    if (recordUndo) rememberFigureState();
    setSelectedByRole(restored);
    setSelectedColorByRole(Object.fromEntries(
      Object.entries(restoredColors).filter(([slot]) => restored[slot as CatalogRole] !== undefined),
    ));
    setFigureName(document.name);
    setDraftPersistencePaused(false);
    return droppedCount;
  };

  const currentFigureDocument = (name = figureName): FigureDocument => createFigureDocument(
    selectedByRole,
    name,
    undefined,
    selectedColorByRole,
  );

  useEffect(() => {
    let active = true;
    const operation = restoreOperationRef.current + 1;
    restoreOperationRef.current = operation;
    setDraftHydrationState("loading");
    setSaveStatus("loading");
    void Promise.all([loadCurrentFigureDraft(), listSavedFigures()])
      .then(async ([document, collection]) => {
        if (!active) return;
        let shared: ReturnType<typeof parseFigureShareLink> | null = null;
        if (hasFigureShareLink(window.location.href)) {
          try {
            shared = parseFigureShareLink(window.location.href);
          } catch {
            setTransferMessageTone("danger");
            setTransferMessage(t("figure.share.invalid"));
          }
        }
        const requestedFigureId = new URLSearchParams(window.location.search).get("figureId");
        const requestedTemplate = figureTemplateForId(new URLSearchParams(window.location.search).get("template"));
        const requestedSavedFigure = requestedFigureId
          ? collection.find(({ id }) => id === requestedFigureId)
          : undefined;
        const storedDocument = document && isUntouchedLegacyDefault(document, LEGACY_DEFAULT_COMPONENT_IDS)
          ? defaultFigureDocument(document.name, document.updatedAt)
          : document;
        // A first-time visitor has no draft: the default figure still needs its catalog
        // packages loaded before slots resolve to parts and the preview can show it.
        const fallbackDocument = defaultFigureDocument(t("figure.defaultName"));
        const initialDocument = shared ?? requestedSavedFigure?.document ?? requestedTemplate?.document
          ?? storedDocument ?? fallbackDocument;
        if (!active) return;
        const droppedCount = await restoreFigureDocument(
          initialDocument,
          false,
          operation,
          initialDocument === storedDocument || initialDocument === fallbackDocument,
        );
        if (!active || restoreOperationRef.current !== operation) return;
        setUndoHistory([]);
        if (droppedCount > 0) {
          setTransferMessageTone("info");
          setTransferMessage(t("figure.restore.partsDropped", { count: droppedCount }));
        }
        if (shared) {
          await saveCurrentFigureDraft(initialDocument);
          if (!active || restoreOperationRef.current !== operation) return;
          setTransferMessageTone("info");
          setTransferMessage(t("figure.share.loaded", { name: initialDocument.name }));
        } else if (requestedSavedFigure) {
          await saveCurrentFigureDraft(initialDocument);
          if (!active || restoreOperationRef.current !== operation) return;
          setTransferMessageTone("info");
          setTransferMessage(t("figure.collection.loaded", { name: initialDocument.name }));
        } else if (requestedTemplate) {
          await saveCurrentFigureDraft(initialDocument);
          if (!active || restoreOperationRef.current !== operation) return;
          setTransferMessageTone("info");
          setTransferMessage(t("figure.template.loaded", { name: t(requestedTemplate.nameKey) }));
        }
        if (shared || requestedSavedFigure || requestedTemplate) {
          window.history.replaceState(
            window.history.state,
            "",
            consumedFigureImportPath(window.location.href),
          );
        }
        setDraftHydrationState("ready");
        setSaveStatus("saved");
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof Error && error.message === RESTORE_SUPERSEDED_ERROR) {
          setDraftHydrationState("ready");
          return;
        }
        setSaveStatus("error");
        setDraftHydrationState("recovery-required");
      });
    return () => { active = false; };
  }, [draftHydrationRevision]);

  useEffect(() => {
    if (draftHydrationState !== "ready" || draftPersistencePaused) return;
    const revision = draftWriteRevisionRef.current + 1;
    draftWriteRevisionRef.current = revision;
    setSaveStatus("loading");
    const timeout = window.setTimeout(() => {
      if (draftWriteRevisionRef.current !== revision) return;
      void saveCurrentFigureDraft(currentFigureDocument())
        .then(() => {
          if (draftWriteRevisionRef.current === revision) setSaveStatus("saved");
        })
        .catch(() => {
          if (draftWriteRevisionRef.current === revision) setSaveStatus("error");
        });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [draftHydrationState, draftPersistencePaused, figureName, selectedByRole, selectedColorByRole]);

  useEffect(() => {
    setShareLink(null);
  }, [selectedByRole, selectedColorByRole]);

  const exportFigure = (): void => {
    downloadFigureDocument(currentFigureDocument(), "figforge-figur.json");
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
      if (errorCode === RESTORE_SUPERSEDED_ERROR) return;
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

  const openCollectionSaveDialog = (): void => {
    setCollectionSaveResult("idle");
    setCollectionSaveDialogOpen(true);
  };

  const saveToCollection = async (name: string): Promise<void> => {
    if (collectionSavePendingRef.current) return;
    collectionSavePendingRef.current = true;
    setCollectionSavePending(true);
    setCollectionSaveResult("idle");
    try {
      setFigureName(name);
      let previewImageDataUrl: string | undefined;
      try {
        previewImageDataUrl = previewCaptureRef.current?.();
      } catch (error) {
        console.warn("Figure preview snapshot could not be created", error);
      }
      await saveFigureToCollection(currentFigureDocument(name), undefined, previewImageDataUrl);
      setTransferMessageTone("info");
      setTransferMessage(t("figure.collection.saved", { name }));
      setCollectionSaveResult("saved");
    } catch {
      setTransferMessageTone("danger");
      setTransferMessage(t("figure.collection.error"));
      setCollectionSaveResult("error");
    } finally {
      collectionSavePendingRef.current = false;
      setCollectionSavePending(false);
    }
  };

  const navigateAfterDraftCommit = async (event: ReactMouseEvent<HTMLAnchorElement>): Promise<void> => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (draftHydrationState !== "ready" || draftPersistencePaused) return;
    event.preventDefault();
    const destination = event.currentTarget.href;
    const revision = draftWriteRevisionRef.current + 1;
    draftWriteRevisionRef.current = revision;
    setSaveStatus("loading");
    try {
      await saveCurrentFigureDraft(currentFigureDocument());
      if (draftWriteRevisionRef.current === revision) setSaveStatus("saved");
      window.location.assign(destination);
    } catch {
      if (draftWriteRevisionRef.current === revision) setSaveStatus("error");
    }
  };

  useEffect(() => {
    if (!isDesktopDrawerLayout) {
      setIsFigurePanelOpen(false);
    }
  }, [isDesktopDrawerLayout]);

  const closeFigurePanel = () => {
    setPurchaseFlowRequested(false);
    setIsFigurePanelOpen(false);
    requestAnimationFrame(() => drawerTriggerRef.current?.focus());
  };

  const activateMobileTab = (tab: MobileTab): void => {
    setOpenedMobileTabs((current) => current.has(tab) ? current : new Set([...current, tab]));
    setMobileTab(tab);
  };

  const openPurchaseFlow = (): void => {
    setPurchaseFlowRequested(true);
    if (isMobileLayout) {
      activateMobileTab("list");
    } else {
      setIsFigurePanelOpen(true);
    }
  };

  useEffect(() => {
    const purchaseFlowIsVisible = isMobileLayout
      ? mobileTab === "list"
      : isFigurePanelOpen;
    if (!purchaseFlowRequested || !purchaseFlowIsVisible) return;
    const frame = requestAnimationFrame(() => {
      const purchaseSection = purchaseSectionRef.current;
      if (purchaseSection && isMobileLayout) {
        purchaseSection.scrollIntoView({ block: "start" });
      } else if (purchaseSection) {
        const scrollContainer = purchaseSection.closest<HTMLElement>(".figure-panel__scroll");
        const stickyHeader = scrollContainer?.querySelector<HTMLElement>(".figure-panel__header");
        if (scrollContainer) {
          const scrollContainerTop = scrollContainer.getBoundingClientRect().top;
          const purchaseSectionTop = purchaseSection.getBoundingClientRect().top;
          const headerOffset = stickyHeader?.offsetHeight ?? 0;
          scrollContainer.scrollTo({
            behavior: "smooth",
            top: Math.max(0, scrollContainer.scrollTop + purchaseSectionTop - scrollContainerTop - headerOffset - 16),
          });
        } else {
          purchaseSection.scrollIntoView({ block: "start" });
        }
      }
      setPurchaseFlowRequested(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [isFigurePanelOpen, isMobileLayout, mobileTab, purchaseFlowRequested]);

  const moveMobileTabFocus = (current: MobileTab, key: string): void => {
    const next = mobileTabForKey(current, key);
    if (!next) return;
    activateMobileTab(next);
    mobileTabRefs.current.get(next)?.focus();
  };

  useEffect(() => {
    if (!isDesktopDrawerLayout || !isFigurePanelOpen) {
      return;
    }

    requestAnimationFrame(() => drawerCloseRef.current?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPurchaseFlowRequested(false);
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
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            if (nextQuery.trim().length > 0) setSemanticSearchEnabled(true);
          }}
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
        {semanticStatus === "loading" || semanticStatus === "error" || semanticSearching ? (
          <div className="semantic-search-controls" data-status={semanticStatus}>
            {semanticStatus === "loading" ? (
              <span role="status">{t("search.semantic.loading", {
                loadedMB: megabytes(semanticProgress.loaded),
                totalMB: megabytes(semanticProgress.total),
              })}</span>
            ) : null}
            {semanticStatus === "ready" && semanticSearching ? <span role="status">{t("search.semantic.searching")}</span> : null}
            {semanticStatus === "error" ? (
              <span className="semantic-search-error">
                {t("search.semantic.error")}
                <Button onClick={() => setSemanticClientRevision((revision) => revision + 1)} size="sm" variant="secondary">
                  {t("search.semantic.retry")}
                </Button>
              </span>
            ) : null}
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
      {draftHydrationState === "recovery-required" ? (
        <div className="draft-recovery">
          <StatusMessage tone="danger">{t("figure.restore.failed")}</StatusMessage>
          <Button onClick={() => setDraftHydrationRevision((revision) => revision + 1)} variant="secondary">
            {t("figure.restore.retry")}
          </Button>
        </div>
      ) : null}
      {deferredQuery.trim().length > 0 && searchResult.outcome === "suggestions" ? (
        <StatusMessage className="search-status" tone="info">
          {t("catalog.suggestionsNotice")}
        </StatusMessage>
      ) : null}
      {catalogLoadState === "loading" ? (
        <StatusMessage tone="info">{t("catalog.loading")}</StatusMessage>
      ) : catalogLoadState === "error" ? (
        <div className="catalog-load-error">
          <StatusMessage tone="danger">
            {t("catalog.loadError")}
          </StatusMessage>
          <Button onClick={() => setCatalogLoadRevision((revision) => revision + 1)} variant="secondary">
            {t("catalog.retry")}
          </Button>
        </div>
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
            onClick={() => setVisiblePartCount((count) => (
              count + (isMobileLayout ? MOBILE_VISIBLE_PARTS_BATCH : DESKTOP_VISIBLE_PARTS_BATCH)
            ))}
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
      <FigureViewport
        onBuyParts={openPurchaseFlow}
        onPreviewCaptureReady={(capture) => { previewCaptureRef.current = capture; }}
        onSaveToCollection={openCollectionSaveDialog}
        onSynchronizationChange={setPreviewSynchronized}
        missingSlotLabels={figureSlots.filter(({ component }) => !component).map(({ label }) => label)}
        selectedParts={selectedLDrawParts}
      />
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
      onSaveToCollection={openCollectionSaveDialog}
      collectionSavePending={collectionSavePending}
      previewSynchronized={previewSynchronized}
      purchaseSectionRef={purchaseSectionRef}
      saveStatus={saveStatus}
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
      <AppHeader active="builder" onNavigate={(event) => void navigateAfterDraftCommit(event)}>
        <Button
          aria-label={undoHistory.length > 0 ? t("figure.undo") : t("figure.undoUnavailable")}
          className="workspace-undo"
          disabled={undoHistory.length === 0}
          onClick={undoLastFigureChange}
          size="sm"
          title={undoHistory.length > 0 ? t("figure.undo") : t("figure.undoUnavailable")}
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
      </AppHeader>

      {isMobileLayout ? (
         <div className="mobile-workspace" aria-label={t("mobile.workspaceLabel")}>
           <div className="mobile-tabs" role="tablist" aria-label={t("mobile.tabsLabel")}>
            {MOBILE_TAB_ORDER.map((tab) => (
              <button
                aria-controls={`mobile-panel-${tab}`}
                aria-selected={mobileTab === tab}
                className="mobile-tab"
                id={`mobile-tab-${tab}`}
                key={tab}
                onClick={() => activateMobileTab(tab)}
                onKeyDown={(event) => {
                  if (!mobileTabForKey(tab, event.key)) return;
                  event.preventDefault();
                  moveMobileTabFocus(tab, event.key);
                }}
                ref={(element) => {
                  if (element) mobileTabRefs.current.set(tab, element);
                  else mobileTabRefs.current.delete(tab);
                }}
                role="tab"
                tabIndex={mobileTab === tab ? 0 : -1}
                type="button"
              >
                {t(`mobile.${tab}`)}
              </button>
            ))}
          </div>
          <div
            className="mobile-tab-panel mobile-parts-panel"
            hidden={mobileTab !== "parts"}
            id="mobile-panel-parts"
            role="tabpanel"
            aria-labelledby="mobile-tab-parts"
          >
            {catalogPanel}
          </div>
          {openedMobileTabs.has("figure") ? (
            <div
              className="mobile-tab-panel"
              hidden={mobileTab !== "figure"}
              id="mobile-panel-figure"
              role="tabpanel"
              aria-labelledby="mobile-tab-figure"
            >
              {viewport}
            </div>
          ) : null}
          {openedMobileTabs.has("list") ? (
            <div
              className="mobile-tab-panel"
              hidden={mobileTab !== "list"}
              id="mobile-panel-list"
              role="tabpanel"
              aria-labelledby="mobile-tab-list"
            >
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

      {collectionSaveDialogOpen ? (
        <SaveToCollectionDialog
          error={collectionSaveResult === "error"}
          initialName={figureName}
          onClose={() => {
            if (!collectionSavePending) setCollectionSaveDialogOpen(false);
          }}
          onSave={saveToCollection}
          pending={collectionSavePending}
          saved={collectionSaveResult === "saved"}
        />
      ) : null}

    </div>
  );
}
