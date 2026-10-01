import releaseJson from "../../data/generated/semantic-search-release.json" with { type: "json" };
import { semanticSearchReleaseSchema } from "../contracts/semantic-search-release.js";

type WorkerResponse =
  | { id: number; type: "progress"; loaded: number; total: number }
  | { id: number; type: "ready" }
  | { id: number; type: "results"; hits: Array<{ componentId: string; score: number }> }
  | { id: number; type: "error"; message: string };

type PendingRequest = {
  resolve: (value: Array<{ componentId: string; score: number }>) => void;
  reject: (error: Error) => void;
};

export const semanticSearchRelease = semanticSearchReleaseSchema.parse(releaseJson);

export async function semanticSearchMissingBytes(): Promise<number> {
  if (!("caches" in window)) return semanticSearchRelease.requiredDownloadBytes;
  try {
    const cache = await caches.open("figforge-semantic-release-v1");
    const cached = await Promise.all(semanticSearchRelease.assets.map(({ url }) => cache.match(url)));
    return semanticSearchRelease.assets.reduce((sum, asset, index) => sum + (cached[index] ? 0 : asset.byteLength), 0);
  } catch {
    return semanticSearchRelease.requiredDownloadBytes;
  }
}

export class SemanticSearchClient {
  readonly #worker = new Worker(new URL("./semantic-search.worker.ts", import.meta.url), { type: "module" });
  readonly #pending = new Map<number, PendingRequest>();
  #nextId = 1;
  #readyPromise: Promise<void> | null = null;
  #onProgress: ((loaded: number, total: number) => void) | null = null;

  constructor() {
    this.#worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === "progress") {
        this.#onProgress?.(message.loaded, message.total);
        return;
      }
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      if (message.type === "error") {
        this.#pending.delete(message.id);
        pending.reject(new Error(message.message));
      } else if (message.type === "ready") {
        this.#pending.delete(message.id);
        pending.resolve([]);
      } else if (message.type === "results") {
        this.#pending.delete(message.id);
        pending.resolve(message.hits);
      }
    };
  }

  initialize(onProgress: (loaded: number, total: number) => void): Promise<void> {
    this.#onProgress = onProgress;
    this.#readyPromise ??= this.#request({ type: "initialize" }).then(() => undefined);
    return this.#readyPromise;
  }

  async search(query: string, limit = 400): Promise<Array<{ componentId: string; score: number }>> {
    if (!this.#readyPromise) throw new Error("Semantic search is not initialized");
    await this.#readyPromise;
    return this.#request({ type: "search", query, limit });
  }

  dispose(): void {
    this.#worker.terminate();
    for (const pending of this.#pending.values()) pending.reject(new Error("Semantic search cancelled"));
    this.#pending.clear();
  }

  #request(message: { type: "initialize" } | { type: "search"; query: string; limit: number }): Promise<Array<{ componentId: string; score: number }>> {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#worker.postMessage({ id, ...message });
    });
  }
}
