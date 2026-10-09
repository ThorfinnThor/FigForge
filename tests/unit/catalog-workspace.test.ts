import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  CATALOG_CATEGORIES,
  builderComponentForCatalogPart,
  catalogAssortment,
  digitallySupportedLDrawEntryForComponent,
  hasExactPrintedGeometry,
  loadCatalogParts,
  thumbnailForComponent,
  verifiedLDrawEntryForComponent,
} from "../../src/components/catalog-workspace-data.js";

describe("FF-14 responsive catalog workspace", () => {
  it("keeps technical methodology out of the figure workflow", async () => {
    const workspaceSource = await readFile("src/components/CatalogWorkspace.tsx", "utf8");
    const methodologySource = await readFile("src/components/MethodologyPage.tsx", "utf8");
    const appSource = await readFile("src/app/App.tsx", "utf8");
    const viewportSource = await readFile("src/components/FigureViewport.tsx", "utf8");

    expect(workspaceSource).not.toContain('className="workspace-methodology"');
    expect(methodologySource).toContain('className="workspace-methodology"');
    expect(methodologySource).toContain('t("source.note")');
    expect(methodologySource).toContain('t("methodology.assembly")');
    expect(appSource).toContain('pathname === "/methodology"');
    expect(viewportSource).not.toContain("Lokaler MVP:");
    expect(viewportSource).not.toContain("lokaler Prototyp");
    expect(viewportSource).not.toContain("keine Garantie für reale Klemmkraft");
  });

  it("explains an empty filtered set and offers a safe filter reset", async () => {
    const source = await readFile("src/components/CatalogWorkspace.tsx", "utf8");

    expect(source).toContain("selectedCatalogSet ? (");
    expect(source).toContain('t("catalog.setFilter.zeroFiltered"');
    expect(source).toContain("setActiveCategory(\"all\")");
    expect(source).toContain("setCatalogViewMode(\"all\")");
    expect(source).toContain("setQuery(\"\")");
    expect(source).toContain('t("catalog.setFilter.showAll")');
  });

  it("evicts rejected catalog loads and exposes an in-place retry", async () => {
    const workspaceSource = await readFile("src/components/CatalogWorkspace.tsx", "utf8");
    const dataSource = await readFile("src/components/catalog-workspace-data.ts", "utf8");

    expect(dataSource).toContain("catalogPackageCache.get(role) === promise");
    expect(dataSource).toContain("catalogPackageCache.delete(role)");
    expect(workspaceSource).toContain("catalogLoadRevision");
    expect(workspaceSource).toContain('t("catalog.retry")');
  });

  it("localizes every user-facing 3D viewport label and status", async () => {
    const viewportSource = await readFile("src/components/FigureViewport.tsx", "utf8");
    const messagesSource = await readFile("src/i18n.tsx", "utf8");

    expect(viewportSource).toContain("const { t } = useI18n()");
    expect(viewportSource).toContain('t("viewport.title")');
    expect(viewportSource).toContain('t(`viewport.camera.${preset.id}`)');
    expect(viewportSource).toContain("t(status.key, status.values)");
    expect(viewportSource).toContain("createdController.setCameraPreset(cameraPresetRef.current)");
    expect(viewportSource).toContain("if (selectionError) return");
    expect(viewportSource).toContain('t("viewport.retrySelection")');
    expect(viewportSource).toContain('t("figure.collection.save")');
    expect(viewportSource).toContain("onClick={onSaveToCollection}");
    expect(viewportSource).toContain('statusTone === "danger"');
    expect(viewportSource).toContain('data-scene-state={sceneState}');
    expect(viewportSource).toContain('data-selection-state={sceneState === "ready" && !selectionError ? "synchronized" : "pending"}');
    expect(viewportSource).not.toContain('className="scene-details"');
    expect(viewportSource).toMatch(/const retrySelection[\s\S]+setSceneRevision/gu);
    expect(viewportSource).not.toContain("Catalog model retry failed");
    expect(viewportSource).toContain("key={sceneRevision}");
    expect(viewportSource).toContain("onSynchronizationChange(false)");
    expect(viewportSource).not.toContain(">Vorschau<");
    expect(viewportSource).not.toContain("Kameraansicht ");
    expect(viewportSource).not.toContain("Eingesetzte LDraw-Modelle");
    expect(messagesSource.match(/"viewport\.title":/gu)).toHaveLength(2);
    expect(messagesSource.match(/"viewport\.status\.selectedAccessory":/gu)).toHaveLength(2);
    expect(messagesSource).toContain("accessory is connected to the left hand");
    expect(messagesSource).not.toContain("accessory is connected to the right hand");
  });

  it("keeps compatibility, transfer errors and saved dates in the selected language", async () => {
    const cardSource = await readFile("src/components/PartCard.tsx", "utf8");
    const workspaceSource = await readFile("src/components/CatalogWorkspace.tsx", "utf8");
    const panelSource = await readFile("src/components/FigurePartsPanel.tsx", "utf8");
    const categorySource = await readFile("src/components/catalog-workspace-data.ts", "utf8");

    expect(cardSource).toContain("compatibility.reasonCode");
    expect(cardSource).not.toContain("compatibility?.message");
    expect(workspaceSource).toContain('t("figure.defaultName")');
    expect(workspaceSource).not.toContain("error.message : t");
    expect(panelSource).toContain("toLocaleDateString(language)");
    expect(panelSource).not.toContain('startsWith("Fehler")');
    expect(panelSource).toContain("tone={transferMessageTone}");
    expect(categorySource).not.toContain('label: "Alle Teile"');
  });

  it("protects draft recovery, consumes imported snapshots and preserves names", async () => {
    const workspaceSource = await readFile("src/components/CatalogWorkspace.tsx", "utf8");
    const panelSource = await readFile("src/components/FigurePartsPanel.tsx", "utf8");
    const collectionDialogSource = await readFile("src/components/SaveToCollectionDialog.tsx", "utf8");

    expect(workspaceSource).toContain('DraftHydrationState = "loading" | "ready" | "recovery-required"');
    expect(workspaceSource).toContain('draftHydrationState !== "ready" || draftPersistencePaused');
    expect(workspaceSource).toContain("consumedFigureImportPath(window.location.href)");
    expect(workspaceSource).toContain("setFigureName(document.name)");
    expect(workspaceSource).toContain("collectionSavePendingRef.current");
    expect(workspaceSource).toContain("setFigureName(name)");
    expect(workspaceSource).toContain("saveFigureToCollection(currentFigureDocument(name))");
    expect(workspaceSource).toContain("<SaveToCollectionDialog");
    expect(collectionDialogSource).toContain('role="dialog"');
    expect(collectionDialogSource).toContain("maxLength={80}");
    expect(collectionDialogSource).toContain('className="collection-save-dialog__check">✓');
    expect(collectionDialogSource).toContain('t("figure.collection.successMessage", { name: normalizedName })');
    expect(panelSource).toContain("loading={collectionSavePending}");
    expect(panelSource).toContain('t("figure.preview.stale")');
  });

  it("wires the curated catalog and figure panel without inventing availability", async () => {
    const source = await readFile("src/components/CatalogWorkspace.tsx", "utf8");
    const dataSource = await readFile("src/components/catalog-workspace-data.ts", "utf8");

    expect(catalogAssortment.components).toHaveLength(17);
    expect(source).toContain("<PartCard");
    expect(source).toContain("<FigurePartsPanel");
    expect(source).toContain("<FigureViewport");
    expect(source).toContain('t("catalog.searchLabel")');
    expect(source).toContain('value={catalogViewMode}');
    expect(source).toContain('value="exact"');
    expect(source).toContain('className="catalog-toolbar__controls"');
    expect(source).toContain('className="catalog-toolbar__policy"');
    expect(source).toContain('data-status={semanticStatus}');
    expect(source).toContain('useState<SemanticSearchStatus>("loading")');
    expect(source).toContain("void client.initialize");
    expect(source).not.toContain("enableSemanticSearch");
    expect(source).toContain("<CatalogSetFilter");
    expect(source).toContain("selectedSetPartNumbers.has(part.rebrickablePartNum");
    expect(source).toContain('t("catalog.policy")');
    expect(source).toContain("onSelect={builderComponent && digitallySupportedLDrawEntryForComponent(builderComponent.id)");
    expect(source).toContain("onSaveToCollection={openCollectionSaveDialog}");
    expect(source).toContain("onSynchronizationChange={setPreviewSynchronized}");
    expect(source).toContain("selectedParts={selectedLDrawParts}");
    expect(source).toContain("saveCurrentFigureDraft");
    expect(source).toContain("parseFigureDocument");
    expect(source).toContain('new URLSearchParams(window.location.search).get("figureId")');
    expect(source).toContain("requestedSavedFigure?.document");
    expect(source).toContain("document.selections.map(({ slot }) => slot)");
    expect(source).toContain("onRemove={removeFromFigure}");
    expect(source.match(/figureSlot\("headwear"/gu)).toHaveLength(1);
    expect(dataSource).not.toContain("ldraw-expanded-catalog.json");
    expect(dataSource).toContain("data/generated/ldraw-runtime/");
  });

  it("loads every Rebrickable Minifig catalog entry from the generated category packages", async () => {
    const allParts = await loadCatalogParts("all");
    const manifest = JSON.parse(await readFile("data/generated/catalog-packages/manifest.json", "utf8")) as {
      includedPartCount: number;
      packages: Array<{ role: string; partCount: number }>;
    };
    const runtimeManifest = JSON.parse(await readFile("data/generated/ldraw-runtime/manifest.json", "utf8")) as {
      totalEntryCount: number;
    };
    const counts = Object.fromEntries(CATALOG_CATEGORIES
      .filter(({ id }) => id !== "all")
      .map(({ id }) => [id, allParts.filter((part) => part.role === id).length]));

    expect(allParts).toHaveLength(manifest.includedPartCount);
    expect(counts).toEqual(Object.fromEntries(manifest.packages.map(({ role, partCount }) => [role, partCount])));
    expect(allParts.filter(builderComponentForCatalogPart))
      .toHaveLength(runtimeManifest.totalEntryCount + catalogAssortment.components.length);
  }, 15_000);

  it("defines responsive tabs, drawer focus return and keyboard dismissal", async () => {
    const source = await readFile("src/components/CatalogWorkspace.tsx", "utf8");
    const figurePanelSource = await readFile("src/components/FigurePartsPanel.tsx", "utf8");
    const styles = await readFile("src/styles/base.css", "utf8");

    expect(source).toContain('role="tablist"');
    expect(source).toContain('role="tabpanel"');
    expect(source).toContain("moveMobileTabFocus");
    expect(source).toContain("mobileTabForKey(tab, event.key)");
    expect(source).toContain('aria-expanded={isFigurePanelOpen}');
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("drawerTriggerRef.current?.focus()");
    expect(source).toContain('t("header.openFigureCount"');
    expect(styles).toContain("@media (min-width: 768px)");
    expect(styles).toContain("@media (min-width: 1440px)");
    expect(styles).toContain("@media (max-width: 767px)");
    expect(styles).toContain("safe-area-inset-bottom");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(styles).toContain("max-height: 100dvh");
    expect(styles).toContain("scrollbar-gutter: stable");
    expect(figurePanelSource).toContain('className="figure-panel__scroll"');
  });

  it("keeps category labels and local thumbnails deterministic", () => {
    expect(CATALOG_CATEGORIES.map(({ id }) => id)).toEqual([
      "all",
      "head",
      "headwear",
      "torsoAssembly",
      "legsAssembly",
      "handAccessory",
    ]);
    const thumbnailUrls = catalogAssortment.components.map(thumbnailForComponent);
    for (const thumbnailUrl of thumbnailUrls) {
      expect(thumbnailUrl).toMatch(/^\/assets\/thumbnails\/(?:ldraw\/)?[a-z0-9-]+\.svg$/u);
    }
    expect(thumbnailUrls.filter((url) => url.startsWith("/assets/thumbnails/ldraw/"))).toHaveLength(10);
  });

  it("keeps the curated subset stable while enabling the expanded official LDraw catalog", async () => {
    const verified = catalogAssortment.components.filter((component) =>
      verifiedLDrawEntryForComponent(component.id),
    );
    const blocked = catalogAssortment.components.filter((component) =>
      !verifiedLDrawEntryForComponent(component.id),
    );
    const cardSource = await readFile("src/components/PartCard.tsx", "utf8");
    const controllerSource = await readFile("src/scene/LDrawPrototypeSceneController.ts", "utf8");
    const coverage = JSON.parse(await readFile("data/generated/ldraw-catalog-coverage.json", "utf8")) as {
      summary: { visualizedPartCount: number; builderReadyPartCount: number };
    };

    expect(verified).toHaveLength(10);
    expect(blocked).toHaveLength(7);
    const allParts = await loadCatalogParts("all");
    expect(allParts.filter((part) => {
      const builderComponent = builderComponentForCatalogPart(part);
      return builderComponent && verifiedLDrawEntryForComponent(builderComponent.id);
    })).toHaveLength(coverage.summary.visualizedPartCount);
    expect(allParts.filter((part) => {
      const builderComponent = builderComponentForCatalogPart(part);
      return builderComponent && digitallySupportedLDrawEntryForComponent(builderComponent.id);
    })).toHaveLength(coverage.summary.builderReadyPartCount);
    expect(cardSource).toContain('t("part.geometry")');
    expect(cardSource).toContain('t("part.rebrickableLink")');
    expect(cardSource).toContain("https://rebrickable.com/parts/${encodeURIComponent(component.rebrickablePartNum)}/");
    expect(cardSource).toContain('rel="noopener noreferrer"');
    expect(cardSource).toContain('target="_blank"');
    expect(cardSource).toContain('disabled={connectionStatus !== "digitally-supported"}');
    expect(cardSource).toContain('t("part.insert")');
    expect(cardSource).toContain('t("part.modelMissingButton")');
    expect(controllerSource).toContain('digitalConnectionStatus = "supported"');
    expect(controllerSource).toContain("physicalFitGuaranteed = false");
    expect(controllerSource).toContain("assertInternalLDrawUrl(selection.modelUrl");
    expect(controllerSource).toContain('legsAssembly: { prototypeFileName: "73200b-f1.dat" }');
  });

  it("focuses the default view on every model in the generated exact semantic-search release", async () => {
    const allParts = await loadCatalogParts("all");
    const searchRelease = JSON.parse(await readFile("data/generated/semantic-search-release.json", "utf8")) as {
      documentCount: number;
    };
    const exactParts = allParts.filter((part) => {
      const component = builderComponentForCatalogPart(part);
      return Boolean(component && hasExactPrintedGeometry(component.id));
    });

    expect(exactParts).toHaveLength(searchRelease.documentCount);
    expect(exactParts.every((part) => {
      const component = builderComponentForCatalogPart(part);
      return Boolean(component && hasExactPrintedGeometry(component.id));
    })).toBe(true);
  }, 15_000);

  it("enables official special lower bodies and keeps missing prints explicit", async () => {
    const legs = await loadCatalogParts("legsAssembly");
    const exactPart = legs.find(({ rebrickablePartNum }) => rebrickablePartNum === "98376pr0002");
    const fallbackPart = legs.find(({ rebrickablePartNum }) => rebrickablePartNum === "36036pr0001");
    const exactComponent = exactPart ? builderComponentForCatalogPart(exactPart) : undefined;
    const fallbackComponent = fallbackPart ? builderComponentForCatalogPart(fallbackPart) : undefined;
    const exactEntry = exactComponent ? verifiedLDrawEntryForComponent(exactComponent.id) : undefined;
    const fallbackEntry = fallbackComponent ? verifiedLDrawEntryForComponent(fallbackComponent.id) : undefined;

    expect(exactEntry?.ldrawFile).toBe("parts/98376p01.dat");
    expect(exactEntry?.geometryFallback).toBeNull();
    expect(fallbackEntry?.ldrawFile).toBe("parts/36036.dat");
    expect(fallbackEntry?.geometryFallback).toEqual({
      kind: "unprinted-print-parent",
      parentPartNums: ["36036"],
    });
  });

  it("enables complete stud-connected Enderman and Bionicle legs", async () => {
    const legs = await loadCatalogParts("legsAssembly");

    for (const partNum of ["19732", "54276"]) {
      const catalogPart = legs.find(({ rebrickablePartNum }) => rebrickablePartNum === partNum);
      const builderComponent = catalogPart ? builderComponentForCatalogPart(catalogPart) : undefined;
      const entry = builderComponent ? verifiedLDrawEntryForComponent(builderComponent.id) : undefined;

      expect(entry?.ldrawFile).toBe(`parts/${partNum}.dat`);
      expect(entry?.geometryFallback).toBeNull();
    }
  });

  it("enables only complete official special torso shortcuts", async () => {
    const torsos = await loadCatalogParts("torsoAssembly");

    for (const partNum of ["11938c01", "24319pr9822", "63208pr9999", "6954c01pr0001", "84638c01pr1442", "98127pr0005"]) {
      const catalogPart = torsos.find(({ rebrickablePartNum }) => rebrickablePartNum === partNum);
      const builderComponent = catalogPart ? builderComponentForCatalogPart(catalogPart) : undefined;
      const entry = builderComponent ? verifiedLDrawEntryForComponent(builderComponent.id) : undefined;

      expect(entry?.geometryFallback).toBeNull();
      expect(entry?.ldrawFile).toMatch(/^parts\/[a-z0-9]+\.dat$/u);
    }

    const incompleteShell = torsos.find(({ rebrickablePartNum }) => rebrickablePartNum === "37777pr0002");
    expect(incompleteShell && builderComponentForCatalogPart(incompleteShell)).toBeUndefined();
  });

  it("uses deterministic standing geometry when a printed black-leg parent is ambiguous", async () => {
    const legs = await loadCatalogParts("legsAssembly");
    const catalogPart = legs.find(({ rebrickablePartNum }) => rebrickablePartNum === "970c03pr0005");
    const builderComponent = catalogPart ? builderComponentForCatalogPart(catalogPart) : undefined;
    const entry = builderComponent ? verifiedLDrawEntryForComponent(builderComponent.id) : undefined;

    expect(builderComponent).toBeDefined();
    expect(entry?.ldrawFile).toBe("parts/3815b.dat");
    expect(entry?.geometryFallback).toEqual({
      kind: "unprinted-assembly-code",
      parentPartNums: ["970c03"],
    });
  });

  it("enables colour-confirmed dual-mould leg variants without choosing an ambiguous shortcut", async () => {
    const legs = await loadCatalogParts("legsAssembly");
    const catalogPart = legs.find(({ rebrickablePartNum }) => rebrickablePartNum === "970c09pat06");
    const builderComponent = catalogPart ? builderComponentForCatalogPart(catalogPart) : undefined;
    const entry = builderComponent ? verifiedLDrawEntryForComponent(builderComponent.id) : undefined;

    expect(builderComponent).toBeDefined();
    expect(entry?.ldrawFile).toBe("parts/3815b.dat");
    expect(entry?.geometryFallback).toBeNull();
  });

  it("replaces obsolete LDraw leg aliases with the colour-confirmed standard assembly", async () => {
    const legs = await loadCatalogParts("legsAssembly");

    for (const partNum of ["970c02", "970c36"]) {
      const catalogPart = legs.find(({ rebrickablePartNum }) => rebrickablePartNum === partNum);
      const builderComponent = catalogPart ? builderComponentForCatalogPart(catalogPart) : undefined;
      const entry = builderComponent ? verifiedLDrawEntryForComponent(builderComponent.id) : undefined;

      expect(entry?.ldrawFile).toBe("parts/3815b.dat");
      expect(entry?.geometryFallback).toBeNull();
    }
  });

  it("uses explicit Rebrickable keyword mappings instead of colliding LDraw filenames", async () => {
    const expectedFiles = new Map([
      ["head:3626bpr0348", "parts/3626bp82.dat"],
      ["headwear:61190c", "parts/61190f.dat"],
      ["handAccessory:50018a", "parts/50018g.dat"],
      ["handAccessory:50018f", "parts/50018e.dat"],
      ["handAccessory:50018g", "parts/50018b.dat"],
    ]);

    for (const [identity, expectedFile] of expectedFiles) {
      const [role, partNum] = identity.split(":") as ["head" | "headwear" | "handAccessory", string];
      const parts = await loadCatalogParts(role);
      const catalogPart = parts.find(({ rebrickablePartNum }) => rebrickablePartNum === partNum);
      const builderComponent = catalogPart ? builderComponentForCatalogPart(catalogPart) : undefined;
      const entry = builderComponent ? verifiedLDrawEntryForComponent(builderComponent.id) : undefined;

      expect(entry?.ldrawFile).toBe(expectedFile);
      expect(entry?.geometryFallback).toBeNull();
    }
  });

  it("enables only the seven audited unique grips that clear the closed reference mesh", async () => {
    const accessories = await loadCatalogParts("handAccessory");
    const expandedCatalog = JSON.parse(await readFile("data/generated/ldraw-expanded-catalog.json", "utf8")) as {
      entries: Array<{
        rebrickablePartNum: string;
        digitalValidation: null | { clearanceMode?: string; collisionSampleCount: number };
      }>;
    };
    const passed = ["23306", "6254", "64567", "73117", "93549", "95228", "95228pr0001"];
    const blocked = [
      "2343", "2614a", "25975pr0001", "25975pr0002", "29596", "33061", "68504",
      "80716pr0001", "87997", "87997pr0001", "87997pr0002", "87997pr0003", "87997pr0004",
    ];
    const entryFor = (partNum: string) => {
      const part = accessories.find(({ rebrickablePartNum }) => rebrickablePartNum === partNum);
      const component = part ? builderComponentForCatalogPart(part) : undefined;
      return component ? digitallySupportedLDrawEntryForComponent(component.id) : undefined;
    };

    for (const partNum of passed) {
      expect(entryFor(partNum)).toBeDefined();
      expect(expandedCatalog.entries.find((entry) => entry.rebrickablePartNum === partNum)?.digitalValidation)
        .toMatchObject({ clearanceMode: "closed-mesh", collisionSampleCount: 0 });
    }
    for (const partNum of blocked) expect(entryFor(partNum)).toBeUndefined();
  });

  it("uses unique pinned snap evidence to resolve only four multi-cylinder accessories", async () => {
    const accessories = await loadCatalogParts("handAccessory");
    const passed = ["30092", "56619", "61190f", "95052"];
    const blocked = ["4341", "10172", "10172pr0001", "89801"];
    const entryFor = (partNum: string) => {
      const part = accessories.find(({ rebrickablePartNum }) => rebrickablePartNum === partNum);
      const component = part ? builderComponentForCatalogPart(part) : undefined;
      return component ? digitallySupportedLDrawEntryForComponent(component.id) : undefined;
    };

    for (const partNum of passed) expect(entryFor(partNum)).toBeDefined();
    for (const partNum of blocked) expect(entryFor(partNum)).toBeUndefined();
  });

  it("uses pinned snap evidence to resolve 27 accessories without cylinder primitives", async () => {
    const accessories = await loadCatalogParts("handAccessory");
    const passed = [
      "37", "59", "4342", "4449", "4499", "18787", "18788", "18789", "18791", "23986",
      "30173a", "30173b", "30229", "38014", "43887", "48495", "71342", "76764", "79741",
      "30193", "61199", "87989", "93055", "93216", "93247", "93559", "95673",
    ];
    const entryFor = (partNum: string) => {
      const part = accessories.find(({ rebrickablePartNum }) => rebrickablePartNum === partNum);
      const component = part ? builderComponentForCatalogPart(part) : undefined;
      return component ? digitallySupportedLDrawEntryForComponent(component.id) : undefined;
    };

    for (const partNum of passed) expect(entryFor(partNum)).toBeDefined();
  });

  it("keeps exact mug prints while inheriting their uniquely declared parent grip", async () => {
    const accessories = await loadCatalogParts("handAccessory");
    const expandedCatalog = JSON.parse(await readFile("data/generated/ldraw-expanded-catalog.json", "utf8")) as {
      entries: Array<{
        rebrickablePartNum: string;
        digitalValidation: null | { gripEvidenceSource: string; gripPrimitive: string };
      }>;
    };

    for (const partNum of ["3899pr0001", "3899pr0002", "3899pr0003", "3899pr0004", "3899pr0005", "3899pr0007", "3899pr0008", "3899pr0009"]) {
      const catalogPart = accessories.find(({ rebrickablePartNum }) => rebrickablePartNum === partNum);
      const builderComponent = catalogPart ? builderComponentForCatalogPart(catalogPart) : undefined;
      const entry = builderComponent ? verifiedLDrawEntryForComponent(builderComponent.id) : undefined;

      expect(entry?.geometryFallback).toBeNull();
      expect(entry?.ldrawFile).toMatch(/^parts\/3899p\d+\.dat$/u);
      const auditEntry = expandedCatalog.entries.find(({ rebrickablePartNum }) => rebrickablePartNum === partNum);
      expect(auditEntry?.digitalValidation?.gripEvidenceSource).toBe("ldcad-shadow-snap");
      expect(auditEntry?.digitalValidation?.gripPrimitive).toMatch(/^ldcad-shadow:parts\/3899\.dat#SNAP_CYL:/u);
    }
  });

  it("enables hand armor only after a collision-free axial grip position is found", async () => {
    const accessories = await loadCatalogParts("handAccessory");
    const catalogPart = accessories.find(({ rebrickablePartNum }) => rebrickablePartNum === "15407");
    const builderComponent = catalogPart ? builderComponentForCatalogPart(catalogPart) : undefined;
    const entry = builderComponent ? digitallySupportedLDrawEntryForComponent(builderComponent.id) : undefined;
    const expandedCatalog = JSON.parse(await readFile("data/generated/ldraw-expanded-catalog.json", "utf8")) as {
      entries: Array<{
        rebrickablePartNum: string;
        digitalValidation: null | { orientationCandidatesTested: number; selectedOrientationIndex: number };
      }>;
    };
    const auditEntry = expandedCatalog.entries.find(({ rebrickablePartNum }) => rebrickablePartNum === "15407");

    expect(entry?.ldrawFile).toBe("parts/15407.dat");
    expect(entry?.geometryFallback).toBeNull();
    expect(auditEntry?.digitalValidation?.orientationCandidatesTested).toBeGreaterThan(8);
    expect(auditEntry?.digitalValidation?.selectedOrientationIndex).toBeGreaterThanOrEqual(8);
  });

  it("uses only unique official complete assembly wrappers for legacy printed bodies", async () => {
    const torsos = await loadCatalogParts("torsoAssembly");
    const legs = await loadCatalogParts("legsAssembly");
    const exactTorso = torsos.find(({ rebrickablePartNum }) => rebrickablePartNum === "973p2d");
    const ambiguousTorso = torsos.find(({ rebrickablePartNum }) => rebrickablePartNum === "973p1e");
    const exactLegs = legs.find(({ rebrickablePartNum }) => rebrickablePartNum === "970c19pr0033");
    const componentOnlyLeg = legs.find(({ rebrickablePartNum }) => rebrickablePartNum === "15447");

    const entryFor = (part: typeof exactTorso) => {
      const component = part ? builderComponentForCatalogPart(part) : undefined;
      return component ? digitallySupportedLDrawEntryForComponent(component.id) : undefined;
    };
    expect(entryFor(exactTorso)).toMatchObject({
      ldrawFile: "parts/76382p2d.dat",
      geometryFallback: null,
    });
    expect(entryFor(ambiguousTorso)).toBeUndefined();
    expect(entryFor(exactLegs)).toMatchObject({
      ldrawFile: "parts/73200bps5.dat",
      geometryFallback: null,
    });
    expect(entryFor(componentOnlyLeg)).toBeUndefined();
  });

  it("enables only audited resolutions of ambiguous official mappings", async () => {
    const heads = await loadCatalogParts("head");
    const legs = await loadCatalogParts("legsAssembly");
    const entryFor = (part: (typeof heads)[number] | undefined) => {
      const component = part ? builderComponentForCatalogPart(part) : undefined;
      return component ? digitallySupportedLDrawEntryForComponent(component.id) : undefined;
    };

    expect(entryFor(heads.find(({ rebrickablePartNum }) => rebrickablePartNum === "3626cpr0976"))).toMatchObject({
      ldrawFile: "parts/3626cpm0.dat",
      geometryFallback: null,
    });
    expect(entryFor(heads.find(({ rebrickablePartNum }) => rebrickablePartNum === "30480pr0001"))).toBeUndefined();
    for (const partNum of ["970c19pr0438", "970c31pr0472", "970c38pr1598"]) {
      expect(entryFor(legs.find(({ rebrickablePartNum }) => rebrickablePartNum === partNum))?.geometryFallback).toBeNull();
    }
    expect(entryFor(legs.find(({ rebrickablePartNum }) => rebrickablePartNum === "970c27pat28"))).toBeUndefined();
  });

  it("enables asymmetric legs only when both leg colours and one hip colour are catalog-backed", async () => {
    const legs = await loadCatalogParts("legsAssembly");
    const safePart = legs.find(({ rebrickablePartNum }) => rebrickablePartNum === "970l03r22pr0907");
    const blockedPart = legs.find(({ rebrickablePartNum }) => rebrickablePartNum === "970l03r12");
    const ambiguousHipPart = legs.find(({ rebrickablePartNum }) => rebrickablePartNum === "970l03r22");
    const safeComponent = safePart ? builderComponentForCatalogPart(safePart) : undefined;
    const blockedComponent = blockedPart ? builderComponentForCatalogPart(blockedPart) : undefined;
    const ambiguousHipComponent = ambiguousHipPart ? builderComponentForCatalogPart(ambiguousHipPart) : undefined;

    expect(safeComponent).toBeDefined();
    expect(safeComponent && verifiedLDrawEntryForComponent(safeComponent.id)?.geometryFallback).toEqual({
      kind: "unprinted-assembly-code",
      parentPartNums: ["970l03r22"],
    });
    expect(blockedComponent).toBeUndefined();
    expect(ambiguousHipComponent).toBeUndefined();
  });
});
