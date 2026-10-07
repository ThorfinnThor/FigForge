import {
  AmbientLight,
  Box3,
  CircleGeometry,
  Color,
  DirectionalLight,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
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
import type { CollectionFigure } from "../collection/collection-figures.js";
import { PLAYGROUND_LAYOUT_MAX_FIGURES } from "../contracts/playground-layout.js";
import { disposeObject3D } from "./dispose-object.js";
import { assertInternalLDrawUrl } from "./ldraw-part-loader.js";
import { OFFICIAL_LDRAW_PUBLIC_PATH } from "./ldraw-release.js";
import type { CameraPreset, LDrawCatalogRole, LDrawCatalogSelection } from "./types.js";

const MODEL_PATH = "/assets/ldraw/prototype/models/figforge-minifigure-packed.mpd";
const MATERIALS_PATH = "/assets/ldraw/prototype/LDConfig.ldr";
const OFFICIAL_FILE_MAP_PATH = `${OFFICIAL_LDRAW_PUBLIC_PATH}file-map.json`;
const MODEL_HEIGHT = 3.08;
const FIGURE_SPACING = 2.2;
const COMPACT_FIGURE_SPACING = 1.72;
const COMPACT_ASPECT_RATIO = 0.9;
const CAMERA_TARGET_Y = 1.66;
const REPLACEMENT_ROLES = ["head", "headwear", "torsoAssembly", "legsAssembly"] as const;
const ALL_ROLES: readonly LDrawCatalogRole[] = [...REPLACEMENT_ROLES, "handAccessory"];

const SLOT_FILES: Record<(typeof REPLACEMENT_ROLES)[number], string> = {
  head: "3626cpcbe.dat",
  headwear: "25409.dat",
  torsoAssembly: "973c01.dat",
  legsAssembly: "73200b-f1.dat",
};

export const collectionFigureOffsets = (count: number, compact = false): readonly number[] => {
  if (!Number.isInteger(count) || count < 0 || count > PLAYGROUND_LAYOUT_MAX_FIGURES) {
    throw new Error(`Playground figure count must be between 0 and ${PLAYGROUND_LAYOUT_MAX_FIGURES}`);
  }
  const spacing = compact ? COMPACT_FIGURE_SPACING : FIGURE_SPACING;
  return Array.from({ length: count }, (_, index) => (index - (count - 1) / 2) * spacing);
};

const groupWidth = (count: number, compact = false): number => {
  const spacing = compact ? COMPACT_FIGURE_SPACING : FIGURE_SPACING;
  return Math.max(2.8, (count - 1) * spacing + 2.6);
};

async function loadOfficialFileMap(baseUrl: string): Promise<Record<string, string>> {
  const url = new URL(OFFICIAL_FILE_MAP_PATH, baseUrl);
  if (url.origin !== new URL(baseUrl).origin) throw new Error("The LDraw file map must be same-origin");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Das LDraw-Dateiverzeichnis konnte nicht geladen werden (${response.status}).`);
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

type CollectionSceneControllerOptions = {
  canvas: HTMLCanvasElement;
  onContextLost: () => void;
  onContextRestored: () => void;
};

export class CollectionSceneController {
  readonly #camera: PerspectiveCamera;
  readonly #canvas: HTMLCanvasElement;
  readonly #controls: OrbitControls;
  readonly #displayRoot = new Group();
  readonly #renderer: WebGLRenderer;
  readonly #resizeObserver: ResizeObserver;
  readonly #resourceTemplates = new Group();
  readonly #scene = new Scene();
  readonly #stage: Mesh;
  readonly #onContextLost: (event: Event) => void;
  readonly #onContextRestored: () => void;
  readonly #catalogTemplateCache = new Map<string, Promise<Group>>();
  #applyRevision = 0;
  #cameraPreset: CameraPreset = "three-quarter";
  #contextLost = false;
  #disposed = false;
  #figureCount = 0;
  #loader: LDrawLoader | null = null;
  #prototypeTemplate: Group | null = null;

  constructor(options: CollectionSceneControllerOptions) {
    this.#canvas = options.canvas;
    this.#renderer = new WebGLRenderer({ canvas: options.canvas, antialias: true, alpha: true });
    this.#renderer.outputColorSpace = SRGBColorSpace;
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.setClearColor(new Color(0x1d2748), 0);

    this.#camera = new PerspectiveCamera(32, 1, 0.1, 100);
    this.#controls = new OrbitControls(this.#camera, options.canvas);
    this.#controls.enablePan = false;
    this.#controls.enableDamping = false;
    this.#controls.minDistance = 4.2;
    this.#controls.maxDistance = 28;
    this.#controls.addEventListener("change", this.#render);

    this.#scene.add(new AmbientLight(0xffffff, 1.65));
    const keyLight = new DirectionalLight(0xfff7e8, 3.1);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    this.#scene.add(keyLight);
    const fillLight = new DirectionalLight(0xb7d8ff, 1.35);
    fillLight.position.set(-6, 5, 3);
    this.#scene.add(fillLight);
    const rimLight = new DirectionalLight(0xffffff, 1.1);
    rimLight.position.set(1, 6, -6);
    this.#scene.add(rimLight);

    this.#stage = new Mesh(
      new CircleGeometry(1.45, 64),
      new MeshStandardMaterial({ color: 0xc4b99f, roughness: 0.9, metalness: 0 }),
    );
    this.#stage.rotation.x = -Math.PI / 2;
    this.#stage.position.y = 0.03;
    this.#stage.receiveShadow = true;
    this.#stage.name = "collection-stage";
    this.#scene.add(this.#stage);

    this.#resourceTemplates.visible = false;
    this.#resourceTemplates.name = "shared-ldraw-resource-templates";
    this.#scene.add(this.#resourceTemplates);
    this.#displayRoot.name = "collection-figures";
    this.#scene.add(this.#displayRoot);

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
    this.#frameCamera();
    this.#resize();
  }

  async load(): Promise<void> {
    const baseUrl = globalThis.location?.href;
    if (!baseUrl) throw new Error("A browser base URL is required for the LDraw collection");
    const loader = new LDrawLoader()
      .setConditionalLineMaterial(LDrawConditionalLineMaterial)
      .setPartsLibraryPath(new URL(OFFICIAL_LDRAW_PUBLIC_PATH, baseUrl).href);
    const [fileMap] = await Promise.all([
      loadOfficialFileMap(baseUrl),
      loader.preloadMaterials(assertInternalLDrawUrl(MATERIALS_PATH, baseUrl).href),
    ]);
    loader.setFileMap(fileMap);
    const model = await loader.loadAsync(assertInternalLDrawUrl(MODEL_PATH, baseUrl).href);
    if (this.#disposed) {
      disposeObject3D(model);
      return;
    }
    this.#normalizePrototype(model);
    this.#loader = loader;
    this.#prototypeTemplate = model;
    this.#resourceTemplates.add(model);
  }

  async applyFigures(figures: readonly CollectionFigure[]): Promise<void> {
    if (this.#disposed) return;
    if (!this.#loader || !this.#prototypeTemplate) {
      throw new Error("Die Collection-Szene ist noch nicht geladen.");
    }
    if (figures.length > PLAYGROUND_LAYOUT_MAX_FIGURES) {
      throw new Error(`Die Collection enthält mehr als ${PLAYGROUND_LAYOUT_MAX_FIGURES} Figuren.`);
    }
    if (new Set(figures.map(({ id }) => id)).size !== figures.length) {
      throw new Error("Die Collection enthält eine Figur mehrfach.");
    }
    const revision = this.#applyRevision + 1;
    this.#applyRevision = revision;
    const rigs = await Promise.all(figures.map((figure) => this.#createFigureRig(figure)));
    if (this.#disposed || revision !== this.#applyRevision) return;

    this.#displayRoot.clear();
    rigs.forEach((rig) => this.#displayRoot.add(rig));
    this.#figureCount = rigs.length;
    this.#layoutFigures();
    this.#frameCamera();
    this.#render();
  }

  setCameraPreset(preset: CameraPreset): void {
    if (this.#disposed) throw new Error("Collection scene controller is disposed");
    this.#cameraPreset = preset;
    this.#frameCamera();
  }

  requestContextRestore(): boolean {
    if (this.#disposed || !this.#contextLost) return false;
    const extension = this.#renderer.getContext().getExtension("WEBGL_lose_context");
    if (!extension) return false;
    extension.restoreContext();
    return true;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#applyRevision += 1;
    this.#resizeObserver.disconnect();
    this.#canvas.removeEventListener("webglcontextlost", this.#onContextLost);
    this.#canvas.removeEventListener("webglcontextrestored", this.#onContextRestored);
    this.#controls.removeEventListener("change", this.#render);
    this.#controls.dispose();
    disposeObject3D(this.#scene);
    this.#renderer.dispose();
    this.#renderer.forceContextLoss();
  }

  async #createFigureRig(figure: CollectionFigure): Promise<Group> {
    const prototype = this.#prototypeTemplate;
    if (!prototype) throw new Error("Die Collection-Grundfigur ist nicht geladen.");
    const roles = new Set<LDrawCatalogRole>();
    for (const selection of figure.selectedParts) {
      if (roles.has(selection.role)) throw new Error(`Figur ${figure.id} enthält ${selection.role} mehrfach.`);
      roles.add(selection.role);
    }

    const model = prototype.clone(true);
    model.visible = true;
    const slots = new Map<LDrawCatalogRole, Object3D>();
    for (const role of REPLACEMENT_ROLES) {
      const slot = model.children.find((child) => child.userData.fileName === SLOT_FILES[role]);
      if (!slot) throw new Error(`LDraw-Prototypslot ${role} konnte nicht gefunden werden.`);
      slots.set(role, slot);
    }
    for (const role of ALL_ROLES) {
      if (!roles.has(role)) slots.get(role)?.removeFromParent();
    }

    const parts = await Promise.all(figure.selectedParts.map(async (selection) => ({
      selection,
      object: (await this.#loadCatalogTemplate(selection)).clone(true),
    })));
    for (const { object, selection } of parts) {
      const previous = slots.get(selection.role);
      previous?.removeFromParent();
      this.#applyPlacement(object, selection);
      model.add(object);
      slots.set(selection.role, object);
    }
    const rig = new Group();
    rig.name = `collection-figure-${figure.id}`;
    rig.userData.savedFigureId = figure.id;
    rig.userData.figureName = figure.name;
    rig.add(model);
    return rig;
  }

  #loadCatalogTemplate(selection: LDrawCatalogSelection): Promise<Group> {
    const cached = this.#catalogTemplateCache.get(selection.modelUrl);
    if (cached) return cached;
    const loader = this.#loader;
    const baseUrl = globalThis.location?.href;
    if (!loader || !baseUrl) throw new Error("Die Collection-Szene ist noch nicht geladen.");
    const modelUrl = assertInternalLDrawUrl(selection.modelUrl, baseUrl);
    const promise = loader.loadAsync(modelUrl.href).then((object) => {
      object.name = `collection-template-${selection.componentId}`;
      object.userData.catalogComponentId = selection.componentId;
      object.traverse((child) => {
        if (child instanceof Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.#resourceTemplates.add(object);
      return object;
    });
    this.#catalogTemplateCache.set(selection.modelUrl, promise);
    return promise;
  }

  #applyPlacement(object: Group, selection: LDrawCatalogSelection): void {
    if (
      !["prototype-family-origin", "snap-connector"].includes(selection.placementMode) ||
      selection.placementTransformLdu.length !== 16
    ) {
      throw new Error(`Für ${selection.componentId} fehlt ein belegter Kandidatentransform.`);
    }
    const placementMatrix = new Matrix4().fromArray([...selection.placementTransformLdu]);
    placementMatrix.decompose(object.position, object.quaternion, object.scale);
    object.name = `collection-part-${selection.componentId}`;
    object.userData.digitalConnectionStatus = "supported";
    object.userData.physicalFitGuaranteed = false;
  }

  #normalizePrototype(model: Group): void {
    model.rotation.x = Math.PI;
    model.updateMatrixWorld(true);
    const unscaledBounds = new Box3().setFromObject(model);
    const unscaledSize = unscaledBounds.getSize(new Vector3());
    if (!Number.isFinite(unscaledSize.y) || unscaledSize.y <= 0) {
      throw new Error("Das LDraw-Prototypmodell besitzt keine gültigen Abmessungen.");
    }
    model.scale.setScalar(MODEL_HEIGHT / unscaledSize.y);
    model.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(model);
    const center = bounds.getCenter(new Vector3());
    model.position.set(-center.x, 0.11 - bounds.min.y, -center.z);
    model.updateMatrixWorld(true);
    model.name = "collection-prototype-template";
    model.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    for (const role of REPLACEMENT_ROLES) {
      if (!model.children.some((child) => child.userData.fileName === SLOT_FILES[role])) {
        throw new Error(`LDraw-Prototypslot ${role} konnte nicht gefunden werden.`);
      }
    }
  }

  #frameCamera(): void {
    const aspect = Math.max(0.35, this.#camera.aspect || 1);
    const width = groupWidth(this.#figureCount, aspect < COMPACT_ASPECT_RATIO);
    const halfFov = this.#camera.fov * Math.PI / 360;
    const horizontalDistance = width / (2 * Math.tan(halfFov) * aspect);
    const distance = Math.max(7.1, horizontalDistance * 1.12);
    const target = new Vector3(0, CAMERA_TARGET_Y, 0);
    const positions: Record<CameraPreset, readonly [number, number, number]> = {
      "three-quarter": [distance * 0.55, 3.45, distance * 0.84],
      front: [0, 2.65, distance],
      back: [0, 2.65, -distance],
    };
    const [x, y, z] = positions[this.#cameraPreset];
    this.#camera.position.set(x, y, z);
    this.#camera.lookAt(target);
    this.#controls.target.copy(target);
    this.#controls.maxDistance = Math.max(12, distance * 1.8);
    this.#controls.update();
    this.#render();
  }

  #layoutFigures(): void {
    const compact = this.#camera.aspect < COMPACT_ASPECT_RATIO;
    const offsets = collectionFigureOffsets(this.#displayRoot.children.length, compact);
    this.#displayRoot.children.forEach((rig, index) => {
      rig.position.x = offsets[index] ?? 0;
    });
    this.#stage.scale.x = Math.max(1, groupWidth(this.#figureCount, compact) / 2.8);
  }

  readonly #render = (): void => {
    if (!this.#disposed && !this.#contextLost) this.#renderer.render(this.#scene, this.#camera);
  };

  #resize(): void {
    if (this.#disposed) return;
    const width = Math.max(1, this.#canvas.clientWidth);
    const height = Math.max(1, this.#canvas.clientHeight);
    this.#renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    this.#renderer.setSize(width, height, false);
    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();
    this.#layoutFigures();
    this.#frameCamera();
  }
}
