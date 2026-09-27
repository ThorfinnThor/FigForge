import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from "three";
import { describe, expect, it, vi } from "vitest";
import { CachingScenePartLoader } from "../../src/scene/caching-scene-part-loader.js";
import type {
  LoadedScenePart,
  ScenePartDefinition,
  ScenePartLoader,
} from "../../src/scene/types.js";

const definition: ScenePartDefinition = {
  id: "ff03-head-3626c",
  label: "Plain",
  slot: "head",
  placementFamily: "fixture-standard-head",
  fixtureStyle: "plain",
};

function createLoaded(dispose = vi.fn()): LoadedScenePart {
  const object = new Group();
  object.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial()));
  return { definition, object, dispose };
}

describe("CachingScenePartLoader", () => {
  it("loads a prototype once and returns independently disposable resource clones", async () => {
    const prototypeDispose = vi.fn();
    const prototype = createLoaded(prototypeDispose);
    const load = vi.fn<ScenePartLoader["load"]>().mockResolvedValue(prototype);
    const delegate: ScenePartLoader = { load };
    const cache = new CachingScenePartLoader(delegate);

    const first = await cache.load(definition, new AbortController().signal);
    const second = await cache.load(definition, new AbortController().signal);
    const firstMesh = first.object.children[0] as Mesh;
    const secondMesh = second.object.children[0] as Mesh;

    expect(load).toHaveBeenCalledOnce();
    expect(first.object).not.toBe(second.object);
    expect(firstMesh.geometry).not.toBe(secondMesh.geometry);
    expect(firstMesh.material).not.toBe(secondMesh.material);

    first.dispose();
    second.dispose();
    cache.dispose();
    expect(prototypeDispose).toHaveBeenCalledOnce();
  });

  it("does not let one aborted caller cancel a shared in-flight load", async () => {
    let resolveLoad: ((loaded: LoadedScenePart) => void) | undefined;
    const load = vi.fn(() => new Promise<LoadedScenePart>((resolve) => {
        resolveLoad = resolve;
      }));
    const delegate: ScenePartLoader = { load };
    const cache = new CachingScenePartLoader(delegate);
    const firstController = new AbortController();
    const first = cache.load(definition, firstController.signal);
    const second = cache.load(definition, new AbortController().signal);

    firstController.abort();
    resolveLoad?.(createLoaded());

    await expect(first).rejects.toMatchObject({ name: "AbortError" });
    await expect(second).resolves.toMatchObject({ definition });
    expect(load).toHaveBeenCalledOnce();
    cache.dispose();
  });

  it("evicts failures so a later request can retry", async () => {
    const load = vi
      .fn<ScenePartLoader["load"]>()
      .mockRejectedValueOnce(new Error("temporary load failure"))
      .mockResolvedValueOnce(createLoaded());
    const delegate: ScenePartLoader = { load };
    const cache = new CachingScenePartLoader(delegate);

    await expect(cache.load(definition, new AbortController().signal)).rejects.toThrow("temporary load failure");
    await expect(cache.load(definition, new AbortController().signal)).resolves.toMatchObject({ definition });
    expect(load).toHaveBeenCalledTimes(2);
    cache.dispose();
  });

  it("disposes a late prototype when the cache is torn down", async () => {
    let resolveLoad: ((loaded: LoadedScenePart) => void) | undefined;
    const prototypeDispose = vi.fn();
    const delegate: ScenePartLoader = {
      load: () => new Promise<LoadedScenePart>((resolve) => {
        resolveLoad = resolve;
      }),
    };
    const cache = new CachingScenePartLoader(delegate);
    const request = cache.load(definition, new AbortController().signal);

    cache.dispose();
    resolveLoad?.(createLoaded(prototypeDispose));

    await expect(request).rejects.toThrow(/disposed/u);
    expect(prototypeDispose).toHaveBeenCalledOnce();
  });
});
