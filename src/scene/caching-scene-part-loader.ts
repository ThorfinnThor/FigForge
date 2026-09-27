import { cloneObject3DResources, disposeObject3D } from "./dispose-object.js";
import type { LoadedScenePart, ScenePartDefinition, ScenePartLoader } from "./types.js";

type CacheEntry = {
  controller: AbortController;
  loaded?: LoadedScenePart;
  promise: Promise<LoadedScenePart>;
};

function abortError(): DOMException {
  return new DOMException("Part load was aborted", "AbortError");
}

function cacheKey(definition: ScenePartDefinition): string {
  return definition.asset?.url ?? definition.id;
}

function waitForCaller<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(abortError());
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    void promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        if (signal.aborted) {
          reject(abortError());
        } else {
          resolve(value);
        }
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error instanceof Error ? error : new Error("Scene part load failed", { cause: error }));
      },
    );
  });
}

export class CachingScenePartLoader implements ScenePartLoader {
  readonly #entries = new Map<string, CacheEntry>();
  #disposed = false;

  constructor(private readonly delegate: ScenePartLoader) {}

  async load(definition: ScenePartDefinition, signal: AbortSignal): Promise<LoadedScenePart> {
    if (this.#disposed) {
      throw new Error("Scene part cache is disposed");
    }
    const key = cacheKey(definition);
    let entry = this.#entries.get(key);
    if (!entry) {
      const controller = new AbortController();
      const delegatePromise = this.delegate.load(definition, controller.signal);
      const createdEntry: CacheEntry = { controller, promise: delegatePromise };
      createdEntry.promise = delegatePromise.then(
        (loaded) => {
          if (this.#disposed) {
            loaded.dispose();
            throw new Error("Scene part cache was disposed while loading");
          }
          createdEntry.loaded = loaded;
          return loaded;
        },
        (error: unknown) => {
          this.#entries.delete(key);
          throw error;
        },
      );
      entry = createdEntry;
      this.#entries.set(key, entry);
    }

    const cached = await waitForCaller(entry.promise, signal);
    const object = cloneObject3DResources(cached.object);
    object.name = definition.id;
    object.userData.catalogVariantId = definition.id;
    return {
      definition,
      object,
      dispose: () => disposeObject3D(object),
    };
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    for (const entry of this.#entries.values()) {
      entry.controller.abort();
      if (entry.loaded) {
        entry.loaded.dispose();
      } else {
        void entry.promise.then(
          (loaded) => loaded.dispose(),
          () => undefined,
        );
      }
    }
    this.#entries.clear();
    this.delegate.dispose?.();
  }
}
