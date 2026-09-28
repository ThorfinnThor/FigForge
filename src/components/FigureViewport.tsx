import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";
import { StatusMessage } from "./ui/StatusMessage.js";
import type { LDrawPrototypeSceneController } from "../scene/LDrawPrototypeSceneController.js";
import type { CameraPreset, LDrawCatalogRole, LDrawCatalogSelection } from "../scene/types.js";
import { CAMERA_PRESETS } from "./figure-poc-options.js";

type FigureViewportProps = {
  selectedParts: readonly LDrawCatalogSelection[];
};

const selectionStatus = (selectedParts: readonly LDrawCatalogSelection[]): string => {
  const accessoryIsConnected = selectedParts.some(({ role }) => role === "handAccessory");
  return `${selectedParts.length} belegte LDraw-Katalogmodelle aktiv.${accessoryIsConnected
    ? " Zubehör ist über das digitale Snap-Profil mit der Referenzhand verbunden."
    : ""}`;
};

export function FigureViewport({ selectedParts }: FigureViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<LDrawPrototypeSceneController | null>(null);
  const selectionRef = useRef(selectedParts);
  const selectionApplyRevisionRef = useRef(0);
  const [sceneRevision, setSceneRevision] = useState(0);
  const [sceneState, setSceneState] = useState<"loading" | "ready" | "context-lost" | "error">("loading");
  const [statusTone, setStatusTone] = useState<"info" | "danger">("info");
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("three-quarter");
  const [status, setStatus] = useState("Offizielle LDraw-Geometrie wird geladen …");
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
    setStatusTone("info");
    setStatus("Offizielle LDraw-Geometrie wird geladen …");

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
            setStatusTone("danger");
            setStatus("WebGL-Kontext verloren. Browserwiederherstellung wird abgewartet.");
          },
          onContextRestored: () => {
            setSceneState("ready");
            setStatusTone("info");
            setStatus("LDraw-Prototyp wiederhergestellt.");
          },
        });
        controller = createdController;
        controllerRef.current = createdController;
        await createdController.load();
        await createdController.applyCatalogSelection(selectionRef.current);
        if (!disposed) {
          setSceneState("ready");
          setStatusTone("info");
          setStatus(selectionStatus(selectionRef.current));
        }
      } catch (error) {
        if (!disposed) {
          controller?.dispose();
          controllerRef.current = null;
          setSceneState("error");
          setStatusTone("danger");
          setStatus(error instanceof Error ? error.message : "3D-Szene konnte nicht geladen werden.");
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
    void controller.applyCatalogSelection(selectionRef.current)
      .then(() => {
        if (selectionApplyRevisionRef.current === revision) {
          setStatusTone("info");
          setStatus(selectionStatus(selectionRef.current));
        }
      })
      .catch((error: unknown) => {
        if (selectionApplyRevisionRef.current === revision) {
          setStatusTone("danger");
          setStatus(error instanceof Error ? error.message : "Katalogmodell konnte nicht geladen werden.");
        }
      });
  }, [sceneState, selectionKey]);

  const chooseCamera = (preset: CameraPreset): void => {
    controllerRef.current?.setCameraPreset(preset);
    setCameraPreset(preset);
    setStatusTone("info");
    setStatus(`Kameraansicht ${CAMERA_PRESETS.find(({ id }) => id === preset)?.label ?? preset}.`);
  };

  const recoverScene = (): void => {
    if (sceneState === "context-lost" && controllerRef.current?.requestContextRestore()) {
      setStatusTone("info");
      setStatus("Wiederherstellung des WebGL-Kontexts wurde angefordert …");
      return;
    }
    setSceneRevision((revision) => revision + 1);
  };

  return (
    <section className="scene-lab" aria-labelledby="scene-heading">
      <div className="scene-copy">
        <p className="eyebrow">Lokaler LDraw-Prototyp</p>
        <h1 id="scene-heading">Echte Teile statt Platzhalter</h1>
        <p className="lede">
          Belegte Katalogmodelle werden über versionierte digitale Anschlussprofile zusammengesetzt.
          Das ist eine digitale Platzierung, keine Garantie für reale Klemmkraft oder Materialspannung.
        </p>

        <dl className="prototype-part-list">
          <div><dt>Beine</dt><dd>Basisprototyp · Katalogmodell blockiert</dd></div>
          {(["torsoAssembly", "head", "headwear", "handAccessory"] as const).map((role) => {
            const part = selectedForRole(role);
            const labels: Record<LDrawCatalogRole, string> = {
              handAccessory: "Zubehör",
              head: "Kopf",
              headwear: "Haare",
              torsoAssembly: "Torso",
            };
            return (
              <div key={role}>
                <dt>{labels[role]}</dt>
                <dd>{part
                  ? `${part.rebrickablePartNum} · LDraw ${part.ldrawUpdate}${role === "handAccessory" ? " · rechte Hand" : ""}`
                  : "Kein belegtes Modell ausgewählt"}</dd>
              </div>
            );
          })}
        </dl>

        <fieldset>
          <legend>Kamera</legend>
          <div className="control-list control-list--compact">
            {CAMERA_PRESETS.map((preset) => (
              <Button
                className="camera-button"
                disabled={!controllerRef.current || sceneState !== "ready"}
                key={preset.id}
                onClick={() => chooseCamera(preset.id)}
                aria-pressed={cameraPreset === preset.id}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </fieldset>

        <StatusMessage tone={statusTone}>{status}</StatusMessage>
        <StatusMessage tone="warning">
          Lokaler MVP: Standardteile mit belegtem Anschlussprofil werden digital zusammengesetzt.
          Nicht belegte Teile bleiben gesperrt.
        </StatusMessage>
        {sceneState === "context-lost" || sceneState === "error" ? (
          <Button onClick={recoverScene} variant="secondary">
            3D-Szene wiederherstellen
          </Button>
        ) : null}
      </div>

      <Card className="viewport-shell">
        <div className="fixture-badge">Offizielle LDraw-Geometrie · lokaler Prototyp</div>
        <canvas
          ref={canvasRef}
          className="viewport"
          aria-label="Interaktive 3D-Vorschau einer aus offiziellen LDraw-Teilen zusammengesetzten Minifigur"
        />
        <p className="viewport-help">Ziehen zum Drehen · Mausrad oder Trackpad zum Zoomen</p>
      </Card>
    </section>
  );
}
