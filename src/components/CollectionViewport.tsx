import { useEffect, useRef, useState } from "react";
import type { CollectionFigure } from "../collection/collection-figures.js";
import type { CollectionSceneController } from "../scene/CollectionSceneController.js";
import type { CameraPreset } from "../scene/types.js";
import { useI18n } from "../i18n.js";
import { CAMERA_PRESETS } from "./figure-poc-options.js";
import { Button } from "./ui/Button.js";
import { StatusMessage } from "./ui/StatusMessage.js";

type CollectionViewportProps = {
  figures: readonly CollectionFigure[];
};

export function CollectionViewport({ figures }: CollectionViewportProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<CollectionSceneController | null>(null);
  const figuresRef = useRef(figures);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("three-quarter");
  const [sceneState, setSceneState] = useState<"loading" | "ready" | "context-lost" | "error">("loading");
  const [sceneRevision, setSceneRevision] = useState(0);
  const hasFigures = figures.length > 0;
  figuresRef.current = figures;
  const figureKey = figures.map(({ id, selectedParts }) =>
    `${id}:${selectedParts.map(({ componentId }) => componentId).join(",")}`).join("|");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasFigures) return;
    let disposed = false;
    let controller: CollectionSceneController | null = null;
    setSceneState("loading");
    void (async () => {
      try {
        const { CollectionSceneController: Controller } = await import("../scene/CollectionSceneController.js");
        if (disposed) return;
        controller = new Controller({
          canvas,
          onContextLost: () => setSceneState("context-lost"),
          onContextRestored: () => setSceneState("ready"),
        });
        controllerRef.current = controller;
        await controller.load();
        await controller.applyFigures(figuresRef.current);
        if (!disposed) setSceneState("ready");
      } catch (error) {
        if (!disposed) {
          controller?.dispose();
          controllerRef.current = null;
          setSceneState("error");
          console.error("Collection scene failed to load", error);
        }
      }
    })();
    return () => {
      disposed = true;
      controller?.dispose();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [hasFigures, sceneRevision]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || sceneState !== "ready") return;
    void controller.applyFigures(figuresRef.current).catch((error: unknown) => {
      console.error("Collection figures failed to update", error);
      setSceneState("error");
    });
  }, [figureKey, sceneState]);

  if (!hasFigures) {
    return <p className="collection-viewport__empty">{t("collection.stageEmpty")}</p>;
  }

  const chooseCamera = (preset: CameraPreset): void => {
    controllerRef.current?.setCameraPreset(preset);
    setCameraPreset(preset);
  };

  const recoverScene = (): void => {
    if (sceneState === "context-lost" && controllerRef.current?.requestContextRestore()) return;
    setSceneRevision((revision) => revision + 1);
  };

  return (
    <div className="collection-viewport">
      <div className="collection-viewport__canvas-shell">
        <canvas
          aria-label={t("collection.canvasLabel")}
          className="collection-viewport__canvas"
          ref={canvasRef}
        />
        <fieldset className="camera-controls collection-viewport__controls">
          <legend>{t("viewport.camera.legend")}</legend>
          <div className="control-list control-list--compact">
            {CAMERA_PRESETS.map((preset) => (
              <Button
                aria-pressed={cameraPreset === preset.id}
                className="camera-button"
                disabled={sceneState !== "ready"}
                key={preset.id}
                onClick={() => chooseCamera(preset.id)}
              >
                {t(`viewport.camera.${preset.id}`)}
              </Button>
            ))}
          </div>
        </fieldset>
      </div>
      <StatusMessage tone={sceneState === "error" || sceneState === "context-lost" ? "danger" : "info"}>
        {sceneState === "loading"
          ? t("collection.status.loading")
          : sceneState === "ready"
            ? t("collection.status.ready", { count: figures.length })
            : t("collection.status.error")}
      </StatusMessage>
      {sceneState === "error" || sceneState === "context-lost" ? (
        <Button onClick={recoverScene} variant="secondary">{t("viewport.recover")}</Button>
      ) : null}
    </div>
  );
}
