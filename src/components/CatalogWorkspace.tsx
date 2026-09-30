import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FigurePartsPanel } from "./FigurePartsPanel.js";
import { FigureViewport } from "./FigureViewport.js";
import { PartCard } from "./PartCard.js";
import {
  CATALOG_CATEGORIES,
  builderComponentForCatalogPart,
  builderComponentForId,
  digitalConnectivityForComponent,
  digitallySupportedLDrawEntryForComponent,
  loadBuilderRoles,
  loadCatalogParts,
  referenceVariant,
  thumbnailForComponent,
  verifiedLDrawEntryForComponent,
  type CatalogCategory,
} from "./catalog-workspace-data.js";
import { Button } from "./ui/Button.js";
import { StatusMessage } from "./ui/StatusMessage.js";
import { TextInput } from "./ui/TextInput.js";
import { searchCatalog } from "../search/catalog-search.js";
import { FIGURE_DOCUMENT_MAX_BYTES, type FigureDocumentSlot } from "../contracts/figure-document.js";
import {
  createFigureDocument,
  parseFigureDocument,
  selectionsFromFigureDocument,
  serializeFigureDocument,
} from "../figure/figure-document.js";
import { loadCurrentFigureDraft, saveCurrentFigureDraft } from "../storage/figure-draft-store.js";
import type { CatalogPackagePart } from "../contracts/catalog-package.js";
import type { LDrawCatalogRole, LDrawCatalogSelection } from "../scene/types.js";

const categoryLabel = new Map(CATALOG_CATEGORIES.map((category) => [category.id, category.label]));

type MobileTab = "parts" | "figure" | "list";
type CatalogRole = CatalogPackagePart["role"];
type CatalogLoadState = "loading" | "ready" | "error";

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

// Saved figures may name parts from any role; their catalog slices must be loaded before the selection is checked.
const builderRolesForDocument = (document: { selections: ReadonlyArray<{ slot: string }> }): CatalogRole[] =>
  document.selections.flatMap(({ slot }) => isLDrawCatalogRole(slot) ? [slot] : []);

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
  const [activeCategory, setActiveCategory] = useState<CatalogCategory>("head");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [catalogParts, setCatalogParts] = useState<readonly CatalogPackagePart[]>([]);
  const [catalogLoadState, setCatalogLoadState] = useState<CatalogLoadState>("loading");
  const [visiblePartCount, setVisiblePartCount] = useState(INITIAL_VISIBLE_PARTS);
  const [mobileTab, setMobileTab] = useState<MobileTab>("parts");
  const [isFigurePanelOpen, setIsFigurePanelOpen] = useState(false);
  const [selectedByRole, setSelectedByRole] = useState(initialSelectionByRole);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"loading" | "saved" | "error">("loading");
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const isMobileLayout = useMediaQuery("(max-width: 767px)");
  const isDrawerLayout = useMediaQuery("(min-width: 768px) and (max-width: 1439px)");
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const searchResult = useMemo(
    () => searchCatalog(
      catalogParts,
      deferredQuery,
      activeCategory === "all" ? undefined : { category: activeCategory },
    ),
    [activeCategory, catalogParts, deferredQuery],
  );
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
    setVisiblePartCount(INITIAL_VISIBLE_PARTS);
  }, [activeCategory, deferredQuery]);

  const selectedComponentIds = new Set(Object.values(selectedByRole));
  const figureSlot = (id: CatalogRole, label: string) => {
    const componentId = selectedByRole[id];
    const component = componentId ? builderComponentForId(componentId) : undefined;
    return { id, label, component, thumbnailUrl: component ? thumbnailForComponent(component) : undefined };
  };
  const figureSlots = [
    figureSlot("head", "Kopf"),
    figureSlot("headwear", "Kopfbedeckung"),
    figureSlot("torsoAssembly", "Oberkörper"),
    figureSlot("legsAssembly", "Beine"),
    figureSlot("handAccessory", "Handzubehör"),
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

  const selectForPreview = (component: CatalogPackagePart): void => {
    if (!digitallySupportedLDrawEntryForComponent(component.id)) {
      return;
    }
    setSelectedByRole((current) => ({ ...current, [component.role]: component.id }));
  };

  const isSupportedDocumentSelection = (componentId: string, slot: FigureDocumentSlot): boolean => {
    const component = builderComponentForId(componentId);
    return component?.role === slot && Boolean(digitallySupportedLDrawEntryForComponent(componentId));
  };

  useEffect(() => {
    let active = true;
    void loadCurrentFigureDraft()
      .then(async (document) => {
        if (!active || !document) return;
        await loadBuilderRoles(builderRolesForDocument(document));
        if (!active) return;
        const restored = selectionsFromFigureDocument(document, isSupportedDocumentSelection);
        if (Object.keys(restored).length === document.selections.length) {
          setSelectedByRole(restored);
        }
      })
      .catch(() => {
        if (active) setSaveStatus("error");
      })
      .finally(() => {
        if (active) setDraftHydrated(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    const timeout = window.setTimeout(() => {
      setSaveStatus("loading");
      void saveCurrentFigureDraft(createFigureDocument(selectedByRole))
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [draftHydrated, selectedByRole]);

  const exportFigure = (): void => {
    const content = serializeFigureDocument(createFigureDocument(selectedByRole));
    const url = URL.createObjectURL(new Blob([content], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "figforge-figur.json";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setTransferMessage("Figurdatei wurde erstellt.");
  };

  const importFigure = async (file: File): Promise<void> => {
    try {
      if (file.size > FIGURE_DOCUMENT_MAX_BYTES) {
        throw new Error("Datei überschreitet das 64-KiB-Limit.");
      }
      const document = parseFigureDocument(await file.text());
      await loadBuilderRoles(builderRolesForDocument(document));
      const restored = selectionsFromFigureDocument(document, isSupportedDocumentSelection);
      if (Object.keys(restored).length !== document.selections.length) {
        throw new Error("Die Datei enthält unbekannte oder digital nicht unterstützte Teile.");
      }
      setSelectedByRole(restored);
      setTransferMessage(`„${document.name}“ wurde geladen.`);
    } catch (error) {
      setTransferMessage(`Fehler: ${error instanceof Error ? error.message : "Ungültige Figurdatei."}`);
    }
  };

  useEffect(() => {
    if (!isDrawerLayout) {
      setIsFigurePanelOpen(false);
    }
  }, [isDrawerLayout]);

  const closeFigurePanel = () => {
    setIsFigurePanelOpen(false);
    requestAnimationFrame(() => drawerTriggerRef.current?.focus());
  };

  useEffect(() => {
    if (!isDrawerLayout || !isFigurePanelOpen) {
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
  }, [isDrawerLayout, isFigurePanelOpen]);

  const categoryRail = (
    <aside className="category-rail" aria-label="Katalogkategorien">
      <p className="category-rail__title">Kategorien</p>
      {CATALOG_CATEGORIES.map((category) => (
        <Button
          aria-label={`${category.label} filtern`}
          aria-pressed={activeCategory === category.id}
          className="category-rail__button"
          data-category={category.id}
          key={category.id}
          onClick={() => setActiveCategory(category.id)}
          size="sm"
          title={category.label}
          variant="ghost"
        >
          {category.label}
        </Button>
      ))}
    </aside>
  );

  const catalogPanel = (
    <section className="catalog-panel" aria-labelledby="catalog-heading">
      <div className="catalog-panel__header">
        <p className="eyebrow">Katalog</p>
        <h1 id="catalog-heading">Baue den Charakter, den du dir vorstellst.</h1>
        <p className="lede">Finde echte Teile mit deinen eigenen Worten.</p>
      </div>
      <div className="catalog-search-sticky">
        <TextInput
          label="Katalog filtern"
          placeholder="Zum Beispiel: Ogerkopf mit Hauern"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          hint={catalogLoadState === "ready"
            ? `${filteredComponents.length} von ${catalogParts.length} Katalogteilen · Basissuche`
            : "Katalogpaket wird geladen …"}
        />
      </div>
      <div className="catalog-toolbar" aria-label="Aktiver Katalogfilter">
        <span className="catalog-toolbar__category">{categoryLabel.get(activeCategory)}</span>
        <span className="catalog-toolbar__mode">20.202 Minifig-Teile · paketweise geladen</span>
        <span className="catalog-toolbar__policy">Nur Rebrickable Catalog Downloads/CSV</span>
      </div>
      {searchResult.query.warnings.length > 0 || searchResult.query.unknownTerms.length > 0 ? (
        <StatusMessage className="search-status" tone="warning">
          {searchResult.query.warnings.join(" ")}
          {searchResult.query.unknownTerms.length > 0
            ? ` Unbekannte Begriffe bleiben erhalten: ${searchResult.query.unknownTerms.join(", ")}.`
            : ""}
        </StatusMessage>
      ) : null}
      {catalogLoadState === "loading" ? (
        <StatusMessage tone="info">Katalogpaket wird geladen …</StatusMessage>
      ) : catalogLoadState === "error" ? (
        <StatusMessage tone="danger">
          Das Katalogpaket konnte nicht geladen werden. Bitte lade die Seite erneut.
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
            Mehr anzeigen ({visibleComponents.length} von {filteredComponents.length})
          </Button>
        ) : null}
        </>
      ) : (
        <StatusMessage tone="warning">
          Kein passender Treffer. Versuche einen allgemeineren Begriff oder ändere die Kategorie.
        </StatusMessage>
      )}
    </section>
  );

  const viewport = (
    <section className="workspace-viewport" aria-label="Figurenvorschau">
      <FigureViewport selectedParts={selectedLDrawParts} />
    </section>
  );

  const figurePanel = (
    <FigurePartsPanel
      closeButtonRef={drawerCloseRef}
      drawer={isDrawerLayout}
      onClose={closeFigurePanel}
      onExport={exportFigure}
      onImport={importFigure}
      saveStatus={saveStatus}
      slots={figureSlots}
      transferMessage={transferMessage}
    />
  );

  return (
    <div className="app-shell" id="builder">
      <header className="app-header">
        <a className="wordmark" href="#builder">Fig<span>Forge</span></a>
        <nav className="app-nav" aria-label="Hauptnavigation">
          <a className="app-nav__link app-nav__link--active" href="#builder" aria-current="page">Builder</a>
          <a className="app-nav__link" href="#figure-panel">Deine Figur</a>
          <a className="app-nav__link" href="#source-hinweis">Hinweise</a>
        </nav>
        <span className="app-header__status">Digitale LDraw-Verbindungen aktiv</span>
        {!isMobileLayout && isDrawerLayout ? (
          <button
            aria-expanded={isFigurePanelOpen}
            className="ff-button ff-button--secondary ff-button--sm workspace-drawer-trigger"
            onClick={() => setIsFigurePanelOpen(true)}
            ref={drawerTriggerRef}
            type="button"
          >
            Deine Figur öffnen
          </button>
        ) : null}
      </header>

      {isMobileLayout ? (
        <div className="mobile-workspace" aria-label="FigForge Builder-Arbeitsfläche">
          <div className="mobile-tabs" role="tablist" aria-label="Builder-Bereiche">
            {([
              ["parts", "Teile"],
              ["figure", "Figur"],
              ["list", "Liste"],
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
              {categoryRail}
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
        <div className="workspace" aria-label="FigForge Builder-Arbeitsfläche">
          {categoryRail}
          {catalogPanel}
          {viewport}
          {isDrawerLayout && isFigurePanelOpen ? (
            <button aria-label="Figurenliste schließen" className="figure-panel-backdrop" onClick={closeFigurePanel} type="button" />
          ) : null}
          {!isDrawerLayout || isFigurePanelOpen ? figurePanel : null}
        </div>
      )}

      <StatusMessage className="workspace-source-note" id="source-hinweis" tone="info">
        Katalogstatus: 20.202 Minifig-Teile aus belegten Rebrickable Catalog Downloads/CSV. Nur Einträge mit geprüftem LDraw-Modell und digitalem Anschlussprofil sind in die Figur einsetzbar; fehlende Bilder werden nicht aus fremden Websiteinhalten ergänzt. MOC-Dateien und Rebrickable-API-Daten werden nicht verwendet.
        {" "}<a href="/licenses/LDraw-CAreadme.txt" target="_blank" rel="noreferrer">LDraw-Lizenzhinweis</a>
        {" · "}<a href="/licenses/LDCadShadowLibrary-NOTICE.txt" target="_blank" rel="noreferrer">Anschlussdaten-Lizenz</a>
      </StatusMessage>
    </div>
  );
}
