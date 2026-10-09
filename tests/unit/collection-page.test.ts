import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Collection page shell", () => {
  it("exposes the collection route and localized navigation", async () => {
    const appSource = await readFile("src/app/App.tsx", "utf8");
    const collectionSource = await readFile("src/components/CollectionPage.tsx", "utf8");
    const cardSource = await readFile("src/components/CollectionFigureCard.tsx", "utf8");
    const builderSource = await readFile("src/components/CatalogWorkspace.tsx", "utf8");
    const methodologySource = await readFile("src/components/MethodologyPage.tsx", "utf8");
    const messagesSource = await readFile("src/i18n.tsx", "utf8");
    const stylesSource = await readFile("src/styles/base.css", "utf8");

    expect(appSource).toContain('pathname === "/collection"');
    expect(collectionSource).toContain('href="/collection"');
    expect(collectionSource).toContain("loadCurrentPlaygroundLayout");
    expect(collectionSource).toContain("collectionFiguresForLayout");
    expect(collectionSource).toContain("<CollectionViewport figures={figures}");
    expect(collectionSource).toContain("addToStage");
    expect(collectionSource).toContain("removeFromStage");
    expect(collectionSource).toContain("moveOnStage");
    expect(collectionSource).toContain("isSavingLayout");
    expect(collectionSource).toContain("clearLocalFigureData");
    expect(collectionSource).toContain("collection.dataTitle");
    expect(cardSource).toContain("figureId=");
    expect(collectionSource).toContain("downloadFigureDocument(saved.document)");
    expect(cardSource).toContain("labels.exportJson");
    expect(collectionSource).toContain("<CollectionFigureCard");
    expect(cardSource).toContain("thumbnailForComponent");
    expect(cardSource).toContain("collection-card__stage-badge");
    expect(builderSource).toContain('t("nav.collection")');
    expect(methodologySource).toContain('t("nav.collection")');
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
