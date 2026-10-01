/// <reference lib="webworker" />
import { env, pipeline } from "@huggingface/transformers";
import releaseJson from "../../data/generated/semantic-search-release.json" with { type: "json" };
import { semanticSearchReleaseSchema } from "../contracts/semantic-search-release.js";
import { normalizeSearchQuery } from "./normalize-query.js";
import { rankSemanticIndex, type SemanticIndex } from "./semantic-index.js";

type WorkerRequest =
  | { id: number; type: "initialize" }
  | { id: number; type: "search"; query: string; limit: number };
type WorkerResponse =
  | { id: number; type: "progress"; loaded: number; total: number }
  | { id: number; type: "ready" }
  | { id: number; type: "results"; hits: Array<{ componentId: string; score: number }> }
  | { id: number; type: "error"; message: string };
type EmbeddingOutput = { data: Float32Array; dims: number[] };

const manifest = semanticSearchReleaseSchema.parse(releaseJson);
const scope = self as unknown as DedicatedWorkerGlobalScope;
const releaseCachePromise = "caches" in scope ? caches.open("figforge-semantic-release-v1") : Promise.resolve(null);
let extractor: Awaited<ReturnType<typeof createExtractor>> | null = null;
let index: SemanticIndex | null = null;
let initialization: Promise<void> | null = null;

const post = (message: WorkerResponse): void => scope.postMessage(message);
const sha256 = async (content: ArrayBuffer): Promise<string> => [...new Uint8Array(await crypto.subtle.digest("SHA-256", content))]
  .map((value) => value.toString(16).padStart(2, "0"))
  .join("");

async function fetchAndVerify(asset: (typeof manifest.assets)[number], requestId: number, loaded: number): Promise<ArrayBuffer> {
  const releaseCache = await releaseCachePromise;
  let cached = await releaseCache?.match(asset.url);
  let response = cached ?? await fetch(asset.url, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Search asset unavailable: ${asset.url}`);
  let content = await response.arrayBuffer();
  let valid = content.byteLength === asset.byteLength && await sha256(content) === asset.sha256;
  if (!valid && cached) {
    await releaseCache?.delete(asset.url);
    cached = undefined;
    response = await fetch(asset.url, { cache: "reload" });
    if (!response.ok) throw new Error(`Search asset unavailable: ${asset.url}`);
    content = await response.arrayBuffer();
    valid = content.byteLength === asset.byteLength && await sha256(content) === asset.sha256;
  }
  if (!valid) {
    throw new Error(`Search asset integrity check failed: ${asset.url}`);
  }
  if (!cached) {
    const headers = new Headers(response.headers);
    headers.set("content-length", String(content.byteLength));
    await releaseCache?.put(asset.url, new Response(content.slice(0), { headers }));
  }
  post({ id: requestId, type: "progress", loaded: loaded + content.byteLength, total: manifest.requiredDownloadBytes });
  return content;
}

async function createExtractor() {
  return pipeline("feature-extraction", manifest.modelId, {
    dtype: "int8",
    local_files_only: true,
  });
}

async function initialize(requestId: number): Promise<void> {
  if (extractor && index) return;
  let loaded = 0;
  let indexBytes: ArrayBuffer | null = null;
  let orderedIds: string[] | null = null;
  for (const asset of manifest.assets) {
    const content = await fetchAndVerify(asset, requestId, loaded);
    loaded += content.byteLength;
    if (asset.kind === "index") indexBytes = content;
    if (asset.kind === "mapping") orderedIds = JSON.parse(new TextDecoder().decode(content)) as string[];
  }
  if (!indexBytes || !orderedIds || orderedIds.length !== manifest.documentCount) throw new Error("Search index metadata is incomplete");
  const values = new Float32Array(indexBytes);
  index = { profileId: "compact-minilm", dimension: manifest.embeddingDimension, orderedComponentIds: orderedIds, values };

  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  // Keep ONNX on its direct, same-origin module URL. Transformers' optional
  // WASM preloader rewrites that module to a blob URL, which violates the
  // production CSP even though the original runtime asset is self-hosted.
  env.useWasmCache = false;
  env.localModelPath = `${scope.location.origin}/search/models/`;
  const releaseCache = await releaseCachePromise;
  if (releaseCache) {
    env.useCustomCache = true;
    env.customCache = releaseCache;
  }
  const wasm = env.backends.onnx.wasm;
  if (!wasm) throw new Error("ONNX WASM runtime is unavailable");
  wasm.wasmPaths = {
    mjs: `${scope.location.origin}/search/runtime/ort-wasm-simd-threaded.mjs`,
    wasm: `${scope.location.origin}/search/runtime/ort-wasm-simd-threaded.wasm`,
  };
  wasm.numThreads = 1;
  extractor = await createExtractor();
}

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  void (async () => {
    try {
      if (request.type === "initialize") {
        initialization ??= initialize(request.id);
        await initialization;
        post({ id: request.id, type: "ready" });
        return;
      }
      initialization ??= initialize(request.id);
      await initialization;
      if (!extractor || !index) throw new Error("Search worker did not initialize");
      const normalized = normalizeSearchQuery(request.query);
      const queryText = normalized.englishText || normalized.originalText;
      const output = await extractor(queryText, { pooling: "mean", normalize: true }) as unknown as EmbeddingOutput;
      if (output.data.length !== manifest.embeddingDimension) throw new Error("Unexpected query embedding dimension");
      const hits = rankSemanticIndex(index, { profileId: "compact-minilm", values: output.data }, request.limit);
      post({ id: request.id, type: "results", hits });
    } catch (error) {
      post({ id: request.id, type: "error", message: error instanceof Error ? error.message : "Unknown search error" });
    }
  })();
};
