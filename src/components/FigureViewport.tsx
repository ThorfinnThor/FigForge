import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";
import { StatusMessage } from "./ui/StatusMessage.js";
import type { LDrawPrototypeSceneController } from "../scene/LDrawPrototypeSceneController.js";
import type { CameraPreset, LDrawCatalogSelection } from "../scene/types.js";
import { useI18n } from "../i18n.js";
import { CAMERA_PRESETS } from "./figure-poc-options.js";

type FigureViewportProps = {
  selectedParts: readonly LDrawCatalogSelection[];
  /** Labels of figure slots that are empty, so a partial figure never looks broken. */
  missingSlotLabels: readonly string[];
  onBuyParts: () => void;
  onSaveToCollection: () => void;
  onSynchronizationChange: (synchronized: boolean) => void;
  onPreviewCaptureReady: (capture: (() => string) | null) => void;
};

type ViewportStatus = {
  key: string;
  values?: Record<string, string | number>;
};

const selectionStatus = (selectedParts: readonly LDrawCatalogSelection[]): ViewportStatus => {
  const accessoryIsConnected = selectedParts.some(({ role }) => role === "handAccessory");
  return {
    key: accessoryIsConnected ? "viewport.status.selectedAccessory" : "viewport.status.selected",
    values: { count: selectedParts.length },
  };
};

const selectionKeyFor = (selectedParts: readonly LDrawCatalogSelection[]): string => selectedParts
  .map(({ componentId, previewColor, role }) => `${role}:${componentId}:${previewColor?.hex ?? ""}:${previewColor?.alpha ?? ""}`)
  .sort()
  .join("|");

export function FigureViewport({
  selectedParts,
  missingSlotLabels,
  onBuyParts,
  onSaveToCollection,
  onSynchronizationChange,
  onPreviewCaptureReady,
}: FigureViewportProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<LDrawPrototypeSceneController | null>(null);
  const selectionRef = useRef(selectedParts);
  const selectionApplyRevisionRef = useRef(0);
  const appliedSelectionKeyRef = useRef<string | null>(null);
  const cameraPresetRef = useRef<CameraPreset>("three-quarter");
  const selectionErrorRef = useRef(false);
  const [sceneRevision, setSceneRevision] = useState(0);
  const [sceneState, setSceneState] = useState<"loading" | "ready" | "context-lost" | "error">("loading");
  const [statusTone, setStatusTone] = useState<"info" | "danger">("info");
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("three-quarter");
  const [selectionError, setSelectionError] = useState(false);
  const [selectionSynchronized, setSelectionSynchronized] = useState(false);
  const [status, setStatus] = useState<ViewportStatus>({ key: "viewport.status.loading" });
  selectionRef.current = selectedParts;
  const selectionKey = selectionKeyFor(selectedParts);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    let disposed = false;
    let controller: LDrawPrototypeSceneController | null = null;
    setSceneState("loading");
    setSelectionSynchronized(false);
    appliedSelectionKeyRef.current = null;
    onSynchronizationChange(false);
    setStatusTone("info");
    setStatus({ key: "viewport.status.loading" });

    void (async () => {
      try {
        const { LDrawPrototypeSceneController: Controller } = await import(
          "../scene/LDrawPrototypeSceneController.js"
        );
        if (disposed) {
          return;
        }
        const createdController = new Controller({
          canvas,
          onContextLost: () => {
            setSceneState("context-lost");
            onSynchronizationChange(false);
            setStatusTone("danger");
            setStatus({ key: "viewport.status.contextLost" });
          },
          onContextRestored: () => {
            setSceneState("ready");
            onSynchronizationChange(!selectionErrorRef.current);
            setStatusTone("info");
            setStatus({ key: "viewport.status.restored" });
          },
        });
        controller = createdController;
        controllerRef.current = createdController;
        await createdController.load();
        createdController.setCameraPreset(cameraPresetRef.current);
        await createdController.applyCatalogSelection(selectionRef.current);
        if (!disposed) {
          appliedSelectionKeyRef.current = selectionKeyFor(selectionRef.current);
          setSceneState("ready");
          setStatusTone("info");
          selectionErrorRef.current = false;
          setSelectionError(false);
          setSelectionSynchronized(true);
          onSynchronizationChange(true);
          setStatus(selectionStatus(selectionRef.current));
          onPreviewCaptureReady(() => createdController.capturePreviewDataUrl());
        }
      } catch (error) {
        if (!disposed) {
          controller?.dispose();
          controllerRef.current = null;
          setSceneState("error");
          onSynchronizationChange(false);
          setStatusTone("danger");
          console.error("3D scene failed to load", error);
          setStatus({ key: "viewport.status.sceneError" });
        }
      }
    })();

    return () => {
      disposed = true;
      selectionApplyRevisionRef.current += 1;
      controller?.dispose();
      onPreviewCaptureReady(null);
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [sceneRevision]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || sceneState !== "ready") {
      return;
    }
    if (appliedSelectionKeyRef.current === selectionKey) return;
    const revision = selectionApplyRevisionRef.current + 1;
    selectionApplyRevisionRef.current = revision;
    onSynchronizationChange(false);
    setSelectionSynchronized(false);
    selectionErrorRef.current = false;
    setSelectionError(false);
    setStatusTone("info");
    setStatus({ key: "viewport.status.loading" });
    void controller.applyCatalogSelection(selectionRef.current)
      .then(() => {
        if (selectionApplyRevisionRef.current === revision) {
          setStatusTone("info");
          selectionErrorRef.current = false;
          setSelectionError(false);
          setSelectionSynchronized(true);
          appliedSelectionKeyRef.current = selectionKey;
          onSynchronizationChange(true);
          setStatus(selectionStatus(selectionRef.current));
        }
      })
      .catch((error: unknown) => {
        if (selectionApplyRevisionRef.current === revision) {
          setStatusTone("danger");
          selectionErrorRef.current = true;
          setSelectionError(true);
          setSelectionSynchronized(false);
          onSynchronizationChange(false);
          console.error("Catalog model failed to load", error);
          setStatus({ key: "viewport.status.partError" });
        }
      });
  }, [sceneState, selectionKey]);

  const chooseCamera = (preset: CameraPreset): void => {
    controllerRef.current?.setCameraPreset(preset);
    cameraPresetRef.current = preset;
    setCameraPreset(preset);
    if (selectionError) return;
    setStatusTone("info");
    setStatus({ key: `viewport.status.camera.${preset}` });
  };

  const recoverScene = (): void => {
    setSceneRevision((revision) => revision + 1);
  };

  const retrySelection = (): void => {
    selectionApplyRevisionRef.current += 1;
    selectionErrorRef.current = false;
    setSelectionError(false);
    onSynchronizationChange(false);
    setSceneRevision((revision) => revision + 1);
  };

  return (
    <section
      className="scene-lab"
      aria-labelledby="scene-heading"
      data-scene-state={sceneState}
      data-selection-state={selectionSynchronized && !selectionError ? "synchronized" : "pending"}
    >
      <Card className="viewport-shell">
        <span className="viewport-shell__beam" aria-hidden="true" />
        <h2 className="viewport-shell__label" id="scene-heading">{t("viewport.title")}</h2>
        <canvas
          key={sceneRevision}
          ref={canvasRef}
          className="viewport"
          aria-label={t("viewport.canvasLabel")}
        />
        {!selectionSynchronized && !selectionError ? (
          <div className="viewport-loading" role="status">
            <span className="viewport-loading__spinner" aria-hidden="true" />
            <span>{t("viewport.status.loading")}</span>
          </div>
        ) : null}
        <fieldset className="camera-controls">
          <legend>{t("viewport.camera.legend")}</legend>
          <div className="control-list control-list--compact">
            {CAMERA_PRESETS.map((preset) => (
              <Button
                className="camera-button"
                disabled={!controllerRef.current || sceneState !== "ready"}
                key={preset.id}
                onClick={() => chooseCamera(preset.id)}
                aria-pressed={cameraPreset === preset.id}
              >
                {t(`viewport.camera.${preset.id}`)}
              </Button>
            ))}
          </div>
        </fieldset>
        {missingSlotLabels.length > 0 ? (
          <p className="viewport-missing" role="status">
            {t("viewport.missing", { slots: missingSlotLabels.join(", ") })}
          </p>
        ) : null}
        <p className="viewport-help">
          <span className="viewport-help__pointer">{t("viewport.help")}</span>
          <span className="viewport-help__touch">{t("viewport.helpTouch")}</span>
        </p>
      </Card>

      <div className="scene-copy">
        {statusTone === "danger" ? (
          <StatusMessage tone="danger">{t(status.key, status.values)}</StatusMessage>
        ) : null}
        {sceneState === "context-lost" || sceneState === "error" ? (
          <Button onClick={recoverScene} variant="secondary">
            {t("viewport.recover")}
          </Button>
        ) : null}
        <div className="scene-copy__actions">
          <Button
            disabled={selectedParts.length === 0 || !selectionSynchronized}
            onClick={onBuyParts}
            size="md"
            variant="primary"
          >
            {t("figure.buyParts")}
          </Button>
          <Button
            disabled={!selectionSynchronized}
            onClick={onSaveToCollection}
            size="md"
            variant="secondary"
          >
            {t("figure.collection.save")}
          </Button>
        </div>
        {selectionError ? (
          <Button onClick={retrySelection} variant="secondary">
            {t("viewport.retrySelection")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
