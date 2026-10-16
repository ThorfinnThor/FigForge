import { useEffect, useRef } from "react";
import { ldrawSelectionsForFigureDocument } from "../collection/collection-figures.js";
import {
  updateSavedFigurePreview,
  type SavedFigure,
} from "../storage/figure-draft-store.js";

type LegacyFigurePreviewMigratorProps = {
  figures: readonly SavedFigure[];
  onMigrated: (saved: SavedFigure) => void;
};

const waitForIdleTurn = (): Promise<void> => new Promise((resolve) => {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => resolve(), { timeout: 1_500 });
    return;
  }
  globalThis.setTimeout(resolve, 32);
});

export function LegacyFigurePreviewMigrator({
  figures,
  onMigrated,
}: LegacyFigurePreviewMigratorProps) {
  const figuresRef = useRef(figures);
  const onMigratedRef = useRef(onMigrated);
  figuresRef.current = figures;
  onMigratedRef.current = onMigrated;

  useEffect(() => {
    const figuresToMigrate = figuresRef.current.filter(({ previewImageDataUrl }) => !previewImageDataUrl);
    if (figuresToMigrate.length === 0) return;
    let cancelled = false;
    let controller: import("../scene/CollectionSceneController.js").CollectionSceneController | null = null;

    void (async () => {
      try {
        await waitForIdleTurn();
        if (cancelled) return;
        const canvas = document.createElement("canvas");
        canvas.width = 420;
        canvas.height = 420;
        const { CollectionSceneController } = await import("../scene/CollectionSceneController.js");
        if (cancelled) return;
        controller = new CollectionSceneController({
          canvas,
          onContextLost: () => undefined,
          onContextRestored: () => undefined,
        });
        await controller.load();

        for (const saved of figuresToMigrate) {
          if (cancelled) break;
          const selectedParts = ldrawSelectionsForFigureDocument(saved.document);
          if (selectedParts.length === 0) continue;
          await controller.applyFigures([{
            id: saved.id,
            name: saved.document.name,
            selectedParts,
          }]);
          const previewImageDataUrl = controller.capturePreviewDataUrl();
          const migrated = await updateSavedFigurePreview(saved.id, previewImageDataUrl);
          if (!cancelled) onMigratedRef.current(migrated);
          await waitForIdleTurn();
        }
      } catch (error) {
        console.warn("Legacy figure previews could not be generated", error);
      } finally {
        controller?.dispose();
      }
    })();

    return () => {
      cancelled = true;
      controller?.dispose();
    };
  }, []);

  return null;
}
