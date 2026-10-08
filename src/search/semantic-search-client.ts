import releaseJson from "../../data/generated/semantic-search-release.json" with { type: "json" };
import { semanticSearchReleaseSchema } from "../contracts/semantic-search-release.js";

type WorkerResponse =
  | { id: number; type: "progress"; loaded: number; total: number }
  | { id: number; type: "ready" }
  | { id: number; type: "results"; hits: Array<{ componentId: string; score: number }> }
  | { id: number; type: "error"; message: string };

const isWorkerResponse = (value: unknown): value is WorkerResponse => {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  if (typeof message.id !== "number" || typeof message.type !== "string") return false;
  if (message.type === "ready") return true;
  if (message.type === "error") return typeof message.message === "string";
  if (message.type === "progress") return typeof message.loaded === "number" && typeof message.total === "number";
  if (message.type === "results") {
    return Array.isArray(message.hits) && message.hits.every((hit) => {
      if (!hit || typeof hit !== "object") return false;
      const candidate = hit as Record<string, unknown>;
      return typeof candidate.componentId === "string" && typeof candidate.score === "number";
    });
  }
  return false;
};

type PendingRequest = {
  resolve: (value: Array<{ componentId: string; score: number }>) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export type SemanticSearchWorker = {
  onerror: ((event: ErrorEvent) => void) | null;
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage: (message: unknown) => void;
  terminate: () => void;
};

type SemanticSearchClientOptions = {
  worker?: SemanticSearchWorker;
  requestTimeoutMs?: number;
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
  readonly #worker: SemanticSearchWorker;
  readonly #requestTimeoutMs: number;
  readonly #pending = new Map<number, PendingRequest>();
  #nextId = 1;
  #readyPromise: Promise<void> | null = null;
  #onProgress: ((loaded: number, total: number) => void) | null = null;
  #failed = false;

  constructor(options: SemanticSearchClientOptions = {}) {
    this.#worker = options.worker
      ?? new Worker(new URL("./semantic-search.worker.ts", import.meta.url), { type: "module" });
    this.#requestTimeoutMs = options.requestTimeoutMs ?? 120_000;
    this.#worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (!isWorkerResponse(message)) {
        this.#fail(new Error("Semantic search worker returned an invalid message"));
        return;
      }
      if (message.type === "progress") {
        this.#onProgress?.(message.loaded, message.total);
        return;
      }
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timeout);
      this.#pending.delete(message.id);
      if (message.type === "error") {
        pending.reject(new Error(message.message));
      } else if (message.type === "ready") {
        pending.resolve([]);
      } else if (message.type === "results") {
        pending.resolve(message.hits);
      }
    };
    this.#worker.onerror = (event: ErrorEvent) => {
      event.preventDefault();
      this.#fail(new Error(event.message || "Semantic search worker failed"));
    };
    this.#worker.onmessageerror = () => {
      this.#fail(new Error("Semantic search worker returned an unreadable message"));
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
    this.#failed = true;
    this.#worker.terminate();
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Semantic search cancelled"));
    }
    this.#pending.clear();
  }

  #request(message: { type: "initialize" } | { type: "search"; query: string; limit: number }): Promise<Array<{ componentId: string; score: number }>> {
    if (this.#failed) return Promise.reject(new Error("Semantic search worker is unavailable"));
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!this.#pending.has(id)) return;
        this.#fail(new Error("Semantic search request timed out"));
      }, this.#requestTimeoutMs);
      this.#pending.set(id, { resolve, reject, timeout });
      try {
        this.#worker.postMessage({ id, ...message });
      } catch (error) {
        clearTimeout(timeout);
        this.#pending.delete(id);
        reject(error instanceof Error ? error : new Error("Semantic search request failed"));
      }
    });
  }

  #fail(error: Error): void {
    if (this.#failed) return;
    this.#failed = true;
    this.#worker.terminate();
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.#pending.clear();
  }
}
