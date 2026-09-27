import {
  AmbientLight,
  CircleGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CachingScenePartLoader } from "./caching-scene-part-loader.js";
import { disposeObject3D } from "./dispose-object.js";
import { createFixtureFigureBase } from "./fixture-assets.js";
import { fixtureAnchorRegistry } from "./fixture-anchor-registry.js";
import { PartSwapCoordinator } from "./part-swap-coordinator.js";
import type {
  CameraPreset,
  FigureSlot,
  ScenePartDefinition,
  ScenePartLoader,
  SwapResult,
} from "./types.js";

export { FixturePartLoader } from "./fixture-assets.js";

export const cameraPresetPositions: Record<CameraPreset, readonly [number, number, number]> = {
  "three-quarter": [4.8, 3.6, 6],
  front: [0, 2.55, 7.2],
  back: [0, 2.55, -7.2],
};

const CAMERA_TARGET = new Vector3(0, 1.65, 0);

type FigureSceneControllerOptions = {
  canvas: HTMLCanvasElement;
  loader: ScenePartLoader;
  onContextLost: () => void;
  onContextRestored: () => void;
};

export class FigureSceneController {
  readonly #camera: PerspectiveCamera;
  readonly #controls: OrbitControls;
  readonly #renderer: WebGLRenderer;
  readonly #scene = new Scene();
  readonly #figureRoot = new Group();
  readonly #swapCoordinator: PartSwapCoordinator;
  readonly #loader: CachingScenePartLoader;
  readonly #resizeObserver: ResizeObserver;
  readonly #canvas: HTMLCanvasElement;
  readonly #onContextLost: (event: Event) => void;
  readonly #onContextRestored: () => void;
  #contextLost = false;
  #disposed = false;

  constructor(options: FigureSceneControllerOptions) {
    this.#canvas = options.canvas;
    this.#renderer = new WebGLRenderer({ canvas: options.canvas, antialias: true, alpha: false });
    this.#renderer.outputColorSpace = SRGBColorSpace;
    this.#renderer.setClearColor(new Color(0xe8e3d8), 1);

    this.#camera = new PerspectiveCamera(34, 1, 0.1, 100);
    this.#controls = new OrbitControls(this.#camera, options.canvas);
    this.#controls.enablePan = false;
    this.#controls.enableDamping = false;
    this.#controls.minDistance = 4.2;
    this.#controls.maxDistance = 9;
    this.#controls.target.copy(CAMERA_TARGET);
    this.#controls.addEventListener("change", this.#render);

    this.#scene.add(new AmbientLight(0xffffff, 1.55));
    const keyLight = new DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(4, 6, 5);
    this.#scene.add(keyLight);
    const fillLight = new DirectionalLight(0xb7d8ff, 1.1);
    fillLight.position.set(-4, 3, -2);
    this.#scene.add(fillLight);

    const stage = new Mesh(
      new CircleGeometry(2.25, 64),
      new MeshStandardMaterial({ color: 0xc7c0b2, roughness: 0.9, metalness: 0 }),
    );
    stage.rotation.x = -Math.PI / 2;
    stage.position.y = 0.035;
    stage.name = "non-purchasable-stage";
    this.#scene.add(stage);

    this.#figureRoot.name = "figure-root";
    this.#figureRoot.userData.anchorProfileId = fixtureAnchorRegistry.document.profileId;
    const fixture = createFixtureFigureBase();
    this.#figureRoot.add(fixture.root);
    this.#scene.add(this.#figureRoot);
    const slotRoots = fixtureAnchorRegistry.createSlotRoots(fixture.torsoAssembly);
    this.#loader = new CachingScenePartLoader(options.loader);
    this.#swapCoordinator = new PartSwapCoordinator(slotRoots, this.#loader, fixtureAnchorRegistry);

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

  async replacePart(slot: FigureSlot, definition: ScenePartDefinition): Promise<SwapResult> {
    const result = await this.#swapCoordinator.replace(slot, definition);
    if (result.status === "applied") {
      this.#render();
    }
    return result;
  }

  replaceHead(definition: ScenePartDefinition): Promise<SwapResult> {
    return this.replacePart("head", definition);
  }

  setCameraPreset(preset: CameraPreset): void {
    if (this.#disposed) {
      throw new Error("Figure scene controller is disposed");
    }
    const [x, y, z] = cameraPresetPositions[preset];
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
    this.#swapCoordinator.dispose();
    this.#loader.dispose();
    disposeObject3D(this.#scene);
    this.#renderer.dispose();
    this.#renderer.forceContextLoss();
  }

  readonly #render = (): void => {
    if (this.#disposed || this.#contextLost) {
      return;
    }
    this.#renderer.render(this.#scene, this.#camera);
  };

  #resize(): void {
    if (this.#disposed) {
      return;
    }
    const width = Math.max(1, this.#canvas.clientWidth);
    const height = Math.max(1, this.#canvas.clientHeight);
    const pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 2);
    this.#renderer.setPixelRatio(pixelRatio);
    this.#renderer.setSize(width, height, false);
    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();
    this.#render();
  }
}
