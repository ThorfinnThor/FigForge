import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  CATALOG_CATEGORIES,
  builderComponentForCatalogPart,
  catalogAssortment,
  digitallySupportedLDrawEntryForComponent,
  loadCatalogParts,
  thumbnailForComponent,
  verifiedLDrawEntryForComponent,
} from "../../src/components/catalog-workspace-data.js";

describe("FF-14 responsive catalog workspace", () => {
  it("wires the curated catalog and figure panel without inventing availability", async () => {
    const source = await readFile("src/components/CatalogWorkspace.tsx", "utf8");
    const dataSource = await readFile("src/components/catalog-workspace-data.ts", "utf8");

    expect(catalogAssortment.components).toHaveLength(17);
    expect(source).toContain("<PartCard");
    expect(source).toContain("<FigurePartsPanel");
    expect(source).toContain("<FigureViewport");
    expect(source).toContain("Katalog filtern");
    expect(source).toContain("Nur Rebrickable Catalog Downloads/CSV");
    expect(source).toContain("Katalogstatus");
    expect(source).toContain("onSelect={builderComponent && digitallySupportedLDrawEntryForComponent(builderComponent.id)");
    expect(source).toContain("<FigureViewport selectedParts={selectedLDrawParts}");
    expect(source).toContain("saveCurrentFigureDraft");
    expect(source).toContain("parseFigureDocument");
    expect(source).toContain("document.selections.map(({ slot }) => slot)");
    expect(dataSource).not.toContain("ldraw-expanded-catalog.json");
    expect(dataSource).toContain("data/generated/ldraw-runtime/");
  });

  it("loads 20,202 Rebrickable Minifig catalog entries from category packages", async () => {
    const allParts = await loadCatalogParts("all");
    const counts = Object.fromEntries(CATALOG_CATEGORIES
      .filter(({ id }) => id !== "all")
      .map(({ id }) => [id, allParts.filter((part) => part.role === id).length]));

    expect(allParts).toHaveLength(20_202);
    expect(counts).toEqual({
      head: 5_402,
      headwear: 2_410,
      torsoAssembly: 7_851,
      legsAssembly: 3_231,
      handAccessory: 1_308,
    });
    expect(allParts.filter(builderComponentForCatalogPart)).toHaveLength(14_680);
  }, 15_000);

  it("defines responsive tabs, drawer focus return and keyboard dismissal", async () => {
    const source = await readFile("src/components/CatalogWorkspace.tsx", "utf8");
    const styles = await readFile("src/styles/base.css", "utf8");

    expect(source).toContain('role="tablist"');
    expect(source).toContain('role="tabpanel"');
    expect(source).toContain('aria-expanded={isFigurePanelOpen}');
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("drawerTriggerRef.current?.focus()");
    expect(source).toContain("Deine Figur öffnen");
    expect(styles).toContain("@media (min-width: 768px) and (max-width: 1439px)");
    expect(styles).toContain("@media (max-width: 767px)");
    expect(styles).toContain("safe-area-inset-bottom");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr)");
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

    expect(verified).toHaveLength(10);
    expect(blocked).toHaveLength(7);
    const allParts = await loadCatalogParts("all");
    expect(allParts.filter((part) => {
      const builderComponent = builderComponentForCatalogPart(part);
      return builderComponent && verifiedLDrawEntryForComponent(builderComponent.id);
    })).toHaveLength(14_673);
    expect(allParts.filter((part) => {
      const builderComponent = builderComponentForCatalogPart(part);
      return builderComponent && digitallySupportedLDrawEntryForComponent(builderComponent.id);
    })).toHaveLength(14_671);
    expect(cardSource).toContain("Geometrie ohne Druck");
    expect(cardSource).toContain('disabled={connectionStatus !== "digitally-supported"}');
    expect(cardSource).toContain("In Figur einsetzen");
    expect(cardSource).toContain("Kein offizielles LDraw-Modell");
    expect(controllerSource).toContain('digitalConnectionStatus = "supported"');
    expect(controllerSource).toContain("physicalFitGuaranteed = false");
    expect(controllerSource).toContain("assertInternalLDrawUrl(selection.modelUrl");
    expect(controllerSource).toContain('legsAssembly: { prototypeFileName: "73200b-f1.dat" }');
  });

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
