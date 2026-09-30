import {
  AmbientLight,
  Box3,
  CircleGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  Matrix4,
  Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { assertInternalLDrawUrl } from "./ldraw-part-loader.js";
import { OFFICIAL_LDRAW_PUBLIC_PATH } from "./ldraw-release.js";
import { disposeObject3D } from "./dispose-object.js";
import type { CameraPreset, LDrawCatalogRole, LDrawCatalogSelection } from "./types.js";

const MODEL_PATH = "/assets/ldraw/prototype/models/figforge-minifigure-packed.mpd";
const MATERIALS_PATH = "/assets/ldraw/prototype/LDConfig.ldr";
const OFFICIAL_PARTS_LIBRARY_PATH = OFFICIAL_LDRAW_PUBLIC_PATH;
const OFFICIAL_FILE_MAP_PATH = `${OFFICIAL_LDRAW_PUBLIC_PATH}file-map.json`;
const MODEL_HEIGHT = 3.08;
const CAMERA_TARGET = new Vector3(0, 1.66, 0);

type PrototypeReplacementRole = Exclude<LDrawCatalogRole, "handAccessory">;

async function loadOfficialFileMap(baseUrl: string): Promise<Record<string, string>> {
  const url = new URL(OFFICIAL_FILE_MAP_PATH, baseUrl);
  if (url.origin !== new URL(baseUrl).origin) {
    throw new Error("The LDraw file map must be same-origin");
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Das LDraw-Dateiverzeichnis konnte nicht geladen werden (${response.status}).`);
  }
  const value: unknown = await response.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Das LDraw-Dateiverzeichnis ist ungültig.");
  }
  const entries = Object.entries(value);
  if (entries.some(([key, path]) => !key || typeof path !== "string" || !path.endsWith(".dat"))) {
    throw new Error("Das LDraw-Dateiverzeichnis enthält ungültige Einträge.");
  }
  return Object.fromEntries(entries);
}

const FIGURE_SLOT_PLACEMENTS: Record<PrototypeReplacementRole, {
  prototypeFileName: string;
}> = {
  head: { prototypeFileName: "3626cpcbe.dat" },
  headwear: { prototypeFileName: "25409.dat" },
  torsoAssembly: { prototypeFileName: "973c01.dat" },
  legsAssembly: { prototypeFileName: "73200b-f1.dat" },
};

const CAMERA_POSITIONS: Record<CameraPreset, readonly [number, number, number]> = {
  "three-quarter": [4.7, 3.45, 6.1],
  front: [0, 2.65, 7.1],
  back: [0, 2.65, -7.1],
};

type PrototypeSceneControllerOptions = {
  canvas: HTMLCanvasElement;
  onContextLost: () => void;
  onContextRestored: () => void;
};

export class LDrawPrototypeSceneController {
  readonly #camera: PerspectiveCamera;
  readonly #canvas: HTMLCanvasElement;
  readonly #controls: OrbitControls;
  readonly #renderer: WebGLRenderer;
  readonly #resizeObserver: ResizeObserver;
  readonly #scene = new Scene();
  readonly #modelRoot = new Group();
  readonly #onContextLost: (event: Event) => void;
  readonly #onContextRestored: () => void;
  #contextLost = false;
  #disposed = false;
  #figureModel: Group | null = null;
  #loader: LDrawLoader | null = null;
  readonly #selectedComponentIds = new Map<LDrawCatalogRole, string>();
  readonly #selectionRevisions = new Map<LDrawCatalogRole, number>();
  readonly #slotObjects = new Map<LDrawCatalogRole, Object3D>();

  constructor(options: PrototypeSceneControllerOptions) {
    this.#canvas = options.canvas;
    this.#renderer = new WebGLRenderer({ canvas: options.canvas, antialias: true, alpha: true });
    this.#renderer.outputColorSpace = SRGBColorSpace;
    this.#renderer.shadowMap.enabled = true;
    // Transparent clear: the display-case backdrop is drawn by CSS behind the canvas.
    this.#renderer.setClearColor(new Color(0x1d2748), 0);

    this.#camera = new PerspectiveCamera(32, 1, 0.1, 100);
    this.#controls = new OrbitControls(this.#camera, options.canvas);
    this.#controls.enablePan = false;
    this.#controls.enableDamping = false;
    this.#controls.minDistance = 4.2;
    this.#controls.maxDistance = 9;
    this.#controls.target.copy(CAMERA_TARGET);
    this.#controls.addEventListener("change", this.#render);

    this.#scene.add(new AmbientLight(0xffffff, 1.65));
    const keyLight = new DirectionalLight(0xfff7e8, 3.1);
    keyLight.position.set(4.5, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    this.#scene.add(keyLight);
    const fillLight = new DirectionalLight(0xb7d8ff, 1.35);
    fillLight.position.set(-5, 4, 2);
    this.#scene.add(fillLight);
    const rimLight = new DirectionalLight(0xffffff, 1.1);
    rimLight.position.set(1, 5, -5);
    this.#scene.add(rimLight);

    const stage = new Mesh(
      new CircleGeometry(1.25, 64),
      new MeshStandardMaterial({ color: 0xc4b99f, roughness: 0.9, metalness: 0 }),
    );
    stage.rotation.x = -Math.PI / 2;
    stage.position.y = 0.03;
    stage.receiveShadow = true;
    stage.name = "prototype-stage";
    this.#scene.add(stage);

    this.#modelRoot.name = "official-ldraw-prototype-root";
    this.#modelRoot.userData.prototypeOnly = true;
    this.#scene.add(this.#modelRoot);

    this.#onContextLost = (event) => {
      event.preventDefault();
      if (!this.#disposed) {
        this.#contextLost = true;
        options.onContextLost();
      }
    };
    this.#onContextRestored = () => {
      if (!this.#disposed) {
        this.#contextLost = false;
        options.onContextRestored();
        this.#render();
      }
    };
    options.canvas.addEventListener("webglcontextlost", this.#onContextLost);
    options.canvas.addEventListener("webglcontextrestored", this.#onContextRestored);

    this.#resizeObserver = new ResizeObserver(() => this.#resize());
    this.#resizeObserver.observe(options.canvas);
    this.setCameraPreset("three-quarter");
    this.#resize();
  }

  async load(): Promise<void> {
    const baseUrl = globalThis.location?.href;
    if (!baseUrl) {
      throw new Error("A browser base URL is required for the LDraw prototype");
    }
    const modelUrl = assertInternalLDrawUrl(MODEL_PATH, baseUrl);
    const materialsUrl = assertInternalLDrawUrl(MATERIALS_PATH, baseUrl);
    const loader = new LDrawLoader()
      .setConditionalLineMaterial(LDrawConditionalLineMaterial)
      .setPartsLibraryPath(new URL(OFFICIAL_PARTS_LIBRARY_PATH, baseUrl).href);

    const [fileMap] = await Promise.all([
      loadOfficialFileMap(baseUrl),
      loader.preloadMaterials(materialsUrl.href),
    ]);
    loader.setFileMap(fileMap);
    this.#loader = loader;
    const model = await loader.loadAsync(modelUrl.href);
    if (this.#disposed) {
      disposeObject3D(model);
      return;
    }

    model.rotation.x = Math.PI;
    model.updateMatrixWorld(true);
    const unscaledBounds = new Box3().setFromObject(model);
    const unscaledSize = unscaledBounds.getSize(new Vector3());
    if (!Number.isFinite(unscaledSize.y) || unscaledSize.y <= 0) {
      disposeObject3D(model);
      throw new Error("Das LDraw-Prototypmodell besitzt keine gültigen Abmessungen.");
    }
    model.scale.setScalar(MODEL_HEIGHT / unscaledSize.y);
    model.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(model);
    const center = bounds.getCenter(new Vector3());
    model.position.set(-center.x, 0.11 - bounds.min.y, -center.z);
    model.updateMatrixWorld(true);
    model.name = "figforge-official-ldraw-minifigure";
    model.userData.appearance = "official-ldraw-prototype";
    model.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    for (const [role, placement] of Object.entries(FIGURE_SLOT_PLACEMENTS) as Array<[
      PrototypeReplacementRole,
      (typeof FIGURE_SLOT_PLACEMENTS)[PrototypeReplacementRole],
    ]>) {
      const slotObject = model.children.find(
        (child) => child.userData.fileName === placement.prototypeFileName,
      );
      if (!slotObject) {
        disposeObject3D(model);
        throw new Error(`LDraw-Prototypslot ${role} konnte nicht gefunden werden.`);
      }
      this.#slotObjects.set(role, slotObject);
    }
    this.#figureModel = model;
    this.#modelRoot.add(model);
    this.#render();
  }

  async applyCatalogSelection(selections: readonly LDrawCatalogSelection[]): Promise<void> {
    if (this.#disposed) {
      return;
    }
    if (!this.#loader || !this.#figureModel) {
      throw new Error("Der LDraw-Prototyp ist noch nicht bereit für eine Katalogauswahl.");
    }

    const roles = new Set<LDrawCatalogRole>();
    for (const selection of selections) {
      if (roles.has(selection.role)) {
        throw new Error(`Die Katalogauswahl enthält den Slot ${selection.role} mehrfach.`);
      }
      roles.add(selection.role);
    }
    await Promise.all(selections.map((selection) => this.#applyCatalogPart(selection)));
    this.#render();
  }

  setCameraPreset(preset: CameraPreset): void {
    if (this.#disposed) {
      throw new Error("LDraw prototype scene controller is disposed");
    }
    const [x, y, z] = CAMERA_POSITIONS[preset];
    this.#camera.position.set(x, y, z);
    this.#camera.lookAt(CAMERA_TARGET);
    this.#controls.update();
    this.#render();
  }

  requestContextRestore(): boolean {
    if (this.#disposed || !this.#contextLost) {
      return false;
    }
    const extension = this.#renderer.getContext().getExtension("WEBGL_lose_context");
    if (!extension) {
      return false;
    }
    extension.restoreContext();
    return true;
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    this.#resizeObserver.disconnect();
    this.#canvas.removeEventListener("webglcontextlost", this.#onContextLost);
    this.#canvas.removeEventListener("webglcontextrestored", this.#onContextRestored);
    this.#controls.removeEventListener("change", this.#render);
    this.#controls.dispose();
    disposeObject3D(this.#scene);
    this.#renderer.dispose();
    this.#renderer.forceContextLoss();
  }

  readonly #render = (): void => {
    if (!this.#disposed && !this.#contextLost) {
      this.#renderer.render(this.#scene, this.#camera);
    }
  };

  async #applyCatalogPart(selection: LDrawCatalogSelection): Promise<void> {
    if (this.#selectedComponentIds.get(selection.role) === selection.componentId) {
      return;
    }
    const loader = this.#loader;
    const figureModel = this.#figureModel;
    if (!loader || !figureModel) {
      throw new Error("Der LDraw-Prototyp ist noch nicht geladen.");
    }

    const baseUrl = globalThis.location?.href;
    if (!baseUrl) {
      throw new Error("A browser base URL is required for the LDraw catalog preview");
    }
    const modelUrl = assertInternalLDrawUrl(selection.modelUrl, baseUrl);
    const revision = (this.#selectionRevisions.get(selection.role) ?? 0) + 1;
    this.#selectionRevisions.set(selection.role, revision);
    const object = await loader.loadAsync(modelUrl.href);

    if (this.#disposed || this.#selectionRevisions.get(selection.role) !== revision) {
      disposeObject3D(object);
      return;
    }

    object.name = `catalog-preview-${selection.componentId}`;
    object.userData.catalogComponentId = selection.componentId;
    object.userData.digitalConnectionStatus = "supported";
    object.userData.physicalFitGuaranteed = false;
    object.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    if (
      !["prototype-family-origin", "snap-connector"].includes(selection.placementMode) ||
      selection.placementTransformLdu?.length !== 16
    ) {
      disposeObject3D(object);
      throw new Error(`Für ${selection.componentId} fehlt ein belegter Kandidatentransform.`);
    }
    const placementMatrix = new Matrix4().fromArray([...selection.placementTransformLdu]);
    placementMatrix.decompose(object.position, object.quaternion, object.scale);
    const previousObject = this.#slotObjects.get(selection.role);
    previousObject?.removeFromParent();
    if (previousObject) {
      disposeObject3D(previousObject);
    }
    figureModel.add(object);
    this.#slotObjects.set(selection.role, object);
    this.#selectedComponentIds.set(selection.role, selection.componentId);
  }

  #resize(): void {
    if (this.#disposed) {
      return;
    }
    const width = Math.max(1, this.#canvas.clientWidth);
    const height = Math.max(1, this.#canvas.clientHeight);
    this.#renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    this.#renderer.setSize(width, height, false);
    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();
    this.#render();
  }
}
