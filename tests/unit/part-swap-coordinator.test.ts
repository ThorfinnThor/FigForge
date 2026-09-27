import { Group } from "three";
import { describe, expect, it, vi } from "vitest";
import { fixtureAnchorRegistry } from "../../src/scene/fixture-anchor-registry.js";
import { PartSwapCoordinator } from "../../src/scene/part-swap-coordinator.js";
import type {
  LoadedScenePart,
  ScenePartDefinition,
  ScenePartLoader,
} from "../../src/scene/types.js";

const plain: ScenePartDefinition = {
  id: "ff03-head-3626c",
  label: "Plain",
  slot: "head",
  placementFamily: "fixture-standard-head",
  fixtureStyle: "plain",
};
const grin: ScenePartDefinition = {
  id: "ff03-head-3626cpr0001",
  label: "Grin",
  slot: "head",
  placementFamily: "fixture-standard-head",
  fixtureStyle: "grin",
};

function createLoaded(definition: ScenePartDefinition) {
  const object = new Group();
  object.name = definition.id;
  const dispose = vi.fn();
  return { loaded: { definition, object, dispose } satisfies LoadedScenePart, dispose };
}

describe("PartSwapCoordinator", () => {
  it("applies only the newest response when loads finish out of order", async () => {
    const root = new Group();
    const roots = fixtureAnchorRegistry.createSlotRoots(root);
    const pending = new Map<string, (value: LoadedScenePart) => void>();
    const loader: ScenePartLoader = {
      load: (definition) =>
        new Promise((resolve) => {
          pending.set(definition.id, resolve);
        }),
    };
    const coordinator = new PartSwapCoordinator(roots, loader, fixtureAnchorRegistry);
    const first = coordinator.replace("head", plain);
    const second = coordinator.replace("head", grin);
    const newest = createLoaded(grin);
    pending.get(grin.id)?.(newest.loaded);

    await expect(second).resolves.toEqual({ status: "applied", variantId: grin.id });
    expect(coordinator.getCurrentVariantId("head")).toBe(grin.id);

    const stale = createLoaded(plain);
    pending.get(plain.id)?.(stale.loaded);
    await expect(first).resolves.toEqual({ status: "superseded", variantId: plain.id });
    expect(stale.dispose).toHaveBeenCalledOnce();
    expect(roots.head.children).toEqual([roots.headwear, newest.loaded.object]);
  });

  it("keeps the previous part when a replacement fails", async () => {
    const root = new Group();
    const roots = fixtureAnchorRegistry.createSlotRoots(root);
    const first = createLoaded(plain);
    const loader: ScenePartLoader = {
      load: vi
        .fn<ScenePartLoader["load"]>()
        .mockResolvedValueOnce(first.loaded)
        .mockRejectedValueOnce(new Error("fixture load failed")),
    };
    const coordinator = new PartSwapCoordinator(roots, loader, fixtureAnchorRegistry);

    await coordinator.replace("head", plain);
    await expect(coordinator.replace("head", grin)).rejects.toThrow("fixture load failed");
    expect(coordinator.getCurrentVariantId("head")).toBe(plain.id);
    expect(roots.head.children).toEqual([roots.headwear, first.loaded.object]);
    expect(first.dispose).not.toHaveBeenCalled();
  });

  it("disposes late results without mutating the scene after teardown", async () => {
    const root = new Group();
    const roots = fixtureAnchorRegistry.createSlotRoots(root);
    let resolveLoad: ((value: LoadedScenePart) => void) | undefined;
    const loader: ScenePartLoader = {
      load: () => new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    };
    const coordinator = new PartSwapCoordinator(roots, loader, fixtureAnchorRegistry);
    const request = coordinator.replace("head", plain);
    const late = createLoaded(plain);

    coordinator.dispose();
    coordinator.dispose();
    resolveLoad?.(late.loaded);

    await expect(request).resolves.toEqual({ status: "disposed", variantId: plain.id });
    expect(late.dispose).toHaveBeenCalledOnce();
    expect(roots.head.children).toEqual([roots.headwear]);
    await expect(coordinator.replace("head", grin)).rejects.toThrow(/disposed/u);
  });
});
