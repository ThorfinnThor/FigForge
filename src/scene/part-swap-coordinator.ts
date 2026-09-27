import type {
  FigureSlot,
  LoadedScenePart,
  ScenePartDefinition,
  ScenePartLoader,
  SwapResult,
} from "./types.js";
import type { AnchorRegistry, SlotRoots } from "./anchor-registry.js";

export class PartSwapCoordinator {
  readonly #current = new Map<FigureSlot, LoadedScenePart>();
  readonly #requests = new Map<FigureSlot, number>();
  readonly #controllers = new Map<FigureSlot, AbortController>();
  #disposed = false;

  constructor(
    private readonly slotRoots: SlotRoots,
    private readonly loader: ScenePartLoader,
    private readonly anchors: AnchorRegistry,
  ) {}

  async replace(slot: FigureSlot, definition: ScenePartDefinition): Promise<SwapResult> {
    if (this.#disposed) {
      throw new Error("Part swap coordinator is disposed");
    }
    if (definition.slot !== slot) {
      throw new Error(`Part ${definition.id} belongs to ${definition.slot}, not ${slot}`);
    }
    this.anchors.assertPlacement(slot, definition.placementFamily);
    const requestId = (this.#requests.get(slot) ?? 0) + 1;
    this.#requests.set(slot, requestId);
    this.#controllers.get(slot)?.abort();
    const controller = new AbortController();
    this.#controllers.set(slot, controller);

    let loaded: LoadedScenePart;
    try {
      loaded = await this.loader.load(definition, controller.signal);
    } catch (error) {
      if (this.#controllers.get(slot) === controller) {
        this.#controllers.delete(slot);
      }
      if (this.#disposed) {
        return { status: "disposed", variantId: definition.id };
      }
      if (controller.signal.aborted && this.#requests.get(slot) !== requestId) {
        return { status: "superseded", variantId: definition.id };
      }
      throw error;
    }

    if (this.#controllers.get(slot) === controller) {
      this.#controllers.delete(slot);
    }
    if (this.#disposed) {
      loaded.dispose();
      return { status: "disposed", variantId: definition.id };
    }
    if (this.#requests.get(slot) !== requestId) {
      loaded.dispose();
      return { status: "superseded", variantId: definition.id };
    }

    const previous = this.#current.get(slot);
    const slotRoot = this.slotRoots[slot];
    slotRoot.add(loaded.object);
    this.#current.set(slot, loaded);
    if (previous) {
      slotRoot.remove(previous.object);
      previous.dispose();
    }
    return { status: "applied", variantId: definition.id };
  }

  getCurrentVariantId(slot: FigureSlot): string | null {
    return this.#current.get(slot)?.definition.id ?? null;
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    for (const controller of this.#controllers.values()) {
      controller.abort();
    }
    for (const loaded of this.#current.values()) {
      loaded.object.parent?.remove(loaded.object);
      loaded.dispose();
    }
    this.#controllers.clear();
    this.#current.clear();
  }
}
