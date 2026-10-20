import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Collection page shell", () => {
  it("exposes the collection route and localized navigation", async () => {
    const appSource = await readFile("src/app/App.tsx", "utf8");
    const collectionSource = await readFile("src/components/CollectionPage.tsx", "utf8");
    const cardSource = await readFile("src/components/CollectionFigureCard.tsx", "utf8");
    const migratorSource = await readFile("src/components/LegacyFigurePreviewMigrator.tsx", "utf8");
    const purchaseDialogSource = await readFile("src/components/CollectionPurchaseDialog.tsx", "utf8");
    const shopExportSource = await readFile("src/components/ShopExportPanel.tsx", "utf8");
    const builderSource = await readFile("src/components/CatalogWorkspace.tsx", "utf8");
    const methodologySource = await readFile("src/components/MethodologyPage.tsx", "utf8");
    const messagesSource = await readFile("src/i18n.tsx", "utf8");
    const stylesSource = await readFile("src/styles/base.css", "utf8");

    expect(appSource).toContain('pathname === "/collection"');
    expect(collectionSource).toContain('<AppHeader active="collection"');
    expect(await readFile("src/components/AppHeader.tsx", "utf8")).toContain('href: "/collection"');
    expect(collectionSource).toContain("loadCurrentPlaygroundStages");
    expect(collectionSource).toContain("collectionFiguresForStage");
    expect(collectionSource).toContain("<StageNameDialog");
    expect(collectionSource).toContain("selectStage");
    expect(collectionSource).toContain("deleteActiveStage");
    expect(collectionSource).toContain("<CollectionViewport figures={figures}");
    expect(collectionSource).toContain("addToStage");
    expect(collectionSource).toContain("removeFromStage");
    expect(collectionSource).toContain("moveOnStage");
    expect(collectionSource).toContain("isSavingLayout");
    expect(collectionSource).toContain("localizeDefaultStageName");
    expect(collectionSource).toContain('["Meine Bühne", "My stage"]');
    expect(collectionSource).toContain("clearLocalFigureData");
    expect(collectionSource).toContain("<CollectionInventoryPanel");
    expect(collectionSource).toContain("collection.dataTitle");
    expect(cardSource).toContain("figureId=");
    expect(collectionSource).toContain("downloadFigureDocument(saved.document)");
    expect(cardSource).toContain("labels.buyFigure");
    expect(purchaseDialogSource).toContain('<ShopExportPanel selections={selections} stepNumber={1} />');
    expect(purchaseDialogSource).toContain("shopExportSelectionsForSavedFigures");
    expect(shopExportSource).toContain('blocker.reason === "multiple-colors"');
    expect(shopExportSource).toContain('href={`${path("/builder")}?figureId=${encodeURIComponent(id)}`}');
    expect(shopExportSource).toContain('t("shop.collectionColors.open", { name })');
    expect(collectionSource).toContain("openStagePurchaseDialog");
    expect(collectionSource).toContain('t("collection.buyStage")');
    expect(collectionSource).toContain("savedFigures={purchaseSelection.figures}");
    expect(purchaseDialogSource).toContain('role="dialog"');
    expect(purchaseDialogSource).toContain("onExportJson");
    expect(collectionSource).toContain("<CollectionFigureCard");
    expect(cardSource).toContain("<FigurePreviewCard");
    expect(cardSource).not.toContain("thumbnailForComponent");
    expect(cardSource).toContain("collection-card__stage-badge");
    expect(collectionSource).toContain("<LegacyFigurePreviewMigrator");
    expect(migratorSource.match(/new CollectionSceneController/gu)).toHaveLength(1);
    expect(migratorSource).toContain("requestIdleCallback");
    expect(migratorSource).toContain("for (const saved of figuresToMigrate)");
    expect(migratorSource).toContain("updateSavedFigurePreview(saved.id, previewImageDataUrl)");
    const headerSource = await readFile("src/components/AppHeader.tsx", "utf8");
    expect(headerSource).toContain('{ id: "collection", href: "/collection", labelKey: "nav.collection" },');
    expect(headerSource.indexOf('id: "collection"')).toBeLessThan(headerSource.indexOf("const SECONDARY_ROUTES"));
    expect(builderSource).toContain('<AppHeader active="builder"');
    expect(methodologySource).toContain('<AppHeader active="methodology"');
    expect(messagesSource.match(/"nav\.collection":/gu)).toHaveLength(2);
    expect(messagesSource.match(/"collection\.stageTitle":/gu)).toHaveLength(2);
    expect(stylesSource).toContain("grid-column: 1 / -1");
    expect(stylesSource).toContain(".collection-page__stage");
  });

  it("recreates the shared scene after an empty stage receives a figure again", async () => {
    const viewportSource = await readFile("src/components/CollectionViewport.tsx", "utf8");

    expect(viewportSource).toContain("const hasFigures = figures.length > 0");
    expect(viewportSource).toContain("[hasFigures, sceneRevision]");
  });
});
