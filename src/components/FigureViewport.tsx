import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";
import { StatusMessage } from "./ui/StatusMessage.js";
import type { LDrawPrototypeSceneController } from "../scene/LDrawPrototypeSceneController.js";
import type { CameraPreset, LDrawCatalogRole, LDrawCatalogSelection } from "../scene/types.js";
import { useI18n } from "../i18n.js";
import { CAMERA_PRESETS } from "./figure-poc-options.js";

type FigureViewportProps = {
  selectedParts: readonly LDrawCatalogSelection[];
  onSynchronizationChange: (synchronized: boolean) => void;
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

export function FigureViewport({ selectedParts, onSynchronizationChange }: FigureViewportProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<LDrawPrototypeSceneController | null>(null);
  const selectionRef = useRef(selectedParts);
  const selectionApplyRevisionRef = useRef(0);
  const cameraPresetRef = useRef<CameraPreset>("three-quarter");
  const selectionErrorRef = useRef(false);
  const [sceneRevision, setSceneRevision] = useState(0);
  const [sceneState, setSceneState] = useState<"loading" | "ready" | "context-lost" | "error">("loading");
  const [statusTone, setStatusTone] = useState<"info" | "danger">("info");
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("three-quarter");
  const [selectionError, setSelectionError] = useState(false);
  const [status, setStatus] = useState<ViewportStatus>({ key: "viewport.status.loading" });
  selectionRef.current = selectedParts;
  const selectionKey = selectedParts
    .map(({ componentId, role }) => `${role}:${componentId}`)
    .sort()
    .join("|");
  const selectedForRole = (role: LDrawCatalogRole) =>
    selectedParts.find((part) => part.role === role);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    let disposed = false;
    let controller: LDrawPrototypeSceneController | null = null;
    setSceneState("loading");
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
          setSceneState("ready");
          setStatusTone("info");
          selectionErrorRef.current = false;
          setSelectionError(false);
          onSynchronizationChange(true);
          setStatus(selectionStatus(selectionRef.current));
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
    const revision = selectionApplyRevisionRef.current + 1;
    selectionApplyRevisionRef.current = revision;
    onSynchronizationChange(false);
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
          onSynchronizationChange(true);
          setStatus(selectionStatus(selectionRef.current));
        }
      })
      .catch((error: unknown) => {
        if (selectionApplyRevisionRef.current === revision) {
          setStatusTone("danger");
          selectionErrorRef.current = true;
          setSelectionError(true);
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
    <section className="scene-lab" aria-labelledby="scene-heading">
      <Card className="viewport-shell">
        <span className="viewport-shell__beam" aria-hidden="true" />
        <h2 className="viewport-shell__label" id="scene-heading">{t("viewport.title")}</h2>
        <canvas
          key={sceneRevision}
          ref={canvasRef}
          className="viewport"
          aria-label={t("viewport.canvasLabel")}
        />
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
        <p className="viewport-help">{t("viewport.help")}</p>
      </Card>

      <div className="scene-copy">
        <StatusMessage tone={statusTone}>{t(status.key, status.values)}</StatusMessage>
        {sceneState === "context-lost" || sceneState === "error" ? (
          <Button onClick={recoverScene} variant="secondary">
            {t("viewport.recover")}
          </Button>
        ) : null}
        {selectionError ? (
          <Button onClick={retrySelection} variant="secondary">
            {t("viewport.retrySelection")}
          </Button>
        ) : null}
        <details className="scene-details">
          <summary>{t("viewport.parts.title")}</summary>
          <dl className="prototype-part-list">
            {(["legsAssembly", "torsoAssembly", "head", "headwear", "handAccessory"] as const).map((role) => {
              const part = selectedForRole(role);
              const labelKeys: Record<LDrawCatalogRole, string> = {
                handAccessory: "viewport.parts.handAccessory",
                head: "viewport.parts.head",
                headwear: "viewport.parts.headwear",
                legsAssembly: "viewport.parts.legsAssembly",
                torsoAssembly: "viewport.parts.torsoAssembly",
              };
              return (
                <div key={role}>
                  <dt>{t(labelKeys[role])}</dt>
                  <dd>{part
                    ? `${part.rebrickablePartNum} · LDraw ${part.ldrawUpdate}${role === "handAccessory" ? ` · ${t("viewport.parts.rightHand")}` : ""}`
                    : role === "legsAssembly" ? t("viewport.parts.basePrototype") : t("viewport.parts.empty")}</dd>
                </div>
              );
            })}
          </dl>
        </details>
      </div>
    </section>
  );
}
