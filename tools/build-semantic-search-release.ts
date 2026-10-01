import { createHash } from "node:crypto";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { env, pipeline } from "@huggingface/transformers";
import { semanticSearchReleaseSchema } from "../src/contracts/semantic-search-release.js";
import type { CatalogPackagePart, CatalogRole } from "../src/contracts/catalog-package.js";

type RuntimeEntry = {
  componentId: string;
  rebrickablePartNum: string;
  geometryFallback?: Record<string, unknown> | null;
};
type ModelLock = {
  profiles: Array<{
    profileId: string;
    exportRepository: string;
    modelRevision: string;
    files: Array<{ path: string; byteLength: number; sha256: string }>;
  }>;
};
type SearchDocument = {
  componentId: string;
  role: CatalogRole;
  rebrickablePartNum: string;
  englishText: string;
};
type EmbeddingOutput = { data: Float32Array; dims: number[] };

const root = process.cwd();
const sourcePolicy = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;
const outputRoot = resolve(root, "public/search");
const profileRoot = resolve(outputRoot, "compact-minilm");
const modelCache = process.env.FIGFORGE_MODEL_CACHE ?? resolve(root, "../../work/hf-local");
const modelLock = JSON.parse(await readFile(resolve(root, "data/search-models.lock.json"), "utf8")) as ModelLock;
const compact = modelLock.profiles.find(({ profileId }) => profileId === "compact-minilm");
if (!compact) throw new Error("compact-minilm model lock is missing");

const roleFiles: Record<CatalogRole, string> = {
  head: "head",
  headwear: "headwear",
  torsoAssembly: "torso-assembly",
  legsAssembly: "legs-assembly",
  handAccessory: "hand-accessory",
};
const roleText: Record<CatalogRole, string> = {
  head: "minifigure head",
  headwear: "minifigure hair helmet or headwear",
  torsoAssembly: "minifigure torso body",
  legsAssembly: "minifigure hips and legs",
  handAccessory: "minifigure hand accessory",
};
const sha256 = (content: Uint8Array | string): string => createHash("sha256").update(content).digest("hex");
const keyFor = (role: CatalogRole, partNum: string): string => `${role}:${partNum.toLowerCase()}`;
const serializeFloat32Le = (values: Float32Array): Uint8Array => {
  const output = new Uint8Array(values.length * Float32Array.BYTES_PER_ELEMENT);
  const view = new DataView(output.buffer);
  values.forEach((value, index) => view.setFloat32(index * Float32Array.BYTES_PER_ELEMENT, value, true));
  return output;
};
const write = async (path: string, content: Uint8Array | string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
};

const curated = JSON.parse(await readFile(resolve(root, "data/curated/ff03-test-assortment.json"), "utf8")) as {
  components: Array<CatalogPackagePart & { colorEvidence: Array<{ colorName: string }> }>;
};
const thumbnails = JSON.parse(await readFile(resolve(root, "data/generated/ldraw-catalog-thumbnails.json"), "utf8")) as {
  entries: Array<{ componentId: string; status: string; geometryFallback?: Record<string, unknown> | null }>;
};
const connectivity = JSON.parse(await readFile(resolve(root, "data/generated/ldraw-digital-connectivity.json"), "utf8")) as {
  entries: Array<{ componentId: string; status: string }>;
};
const exactCuratedIds = new Set(thumbnails.entries
  .filter(({ status, geometryFallback }) => status === "verified" && (geometryFallback === null || geometryFallback === undefined))
  .map(({ componentId }) => componentId));
const supportedCuratedIds = new Set(connectivity.entries
  .filter(({ status }) => status === "digitally-supported")
  .map(({ componentId }) => componentId));
const curatedByKey = new Map(curated.components.map((part) => [keyFor(part.role, part.rebrickablePartNum), part]));
const documentsByKey = new Map<string, SearchDocument>();

const addDocument = (part: CatalogPackagePart, componentId: string, colors: readonly string[]): void => {
  const uniqueColors = [...new Set(colors)].sort((left, right) => left.localeCompare(right, "en"));
  documentsByKey.set(keyFor(part.role, part.rebrickablePartNum), {
    componentId,
    role: part.role,
    rebrickablePartNum: part.rebrickablePartNum,
    englishText: [
      part.name,
      `Category: ${part.rebrickableCategoryName}.`,
      `Type: ${roleText[part.role]}.`,
      uniqueColors.length > 0 ? `Colors: ${uniqueColors.join(", ")}.` : "",
      `Part ID: ${part.rebrickablePartNum}.`,
    ].filter(Boolean).join(" "),
  });
};

for (const [role, fileName] of Object.entries(roleFiles) as Array<[CatalogRole, string]>) {
  const catalog = JSON.parse(await readFile(resolve(root, `data/generated/catalog-packages/${fileName}.json`), "utf8")) as { parts: CatalogPackagePart[] };
  const runtime = JSON.parse(await readFile(resolve(root, `data/generated/ldraw-runtime/${fileName}.json`), "utf8")) as { entries: RuntimeEntry[] };
  const parts = new Map(catalog.parts.map((part) => [part.rebrickablePartNum.toLowerCase(), part]));
  for (const entry of runtime.entries) {
    if (entry.geometryFallback !== null && entry.geometryFallback !== undefined) continue;
    const part = parts.get(entry.rebrickablePartNum.toLowerCase());
    if (!part) throw new Error(`Runtime entry has no catalog document: ${entry.componentId}`);
    const curatedPart = curatedByKey.get(keyFor(role, part.rebrickablePartNum));
    addDocument(curatedPart ?? part, curatedPart?.id ?? part.id, curatedPart
      ? curatedPart.colorEvidence.map(({ colorName }) => colorName)
      : part.colorNames);
  }
}
for (const part of curated.components) {
  if (!exactCuratedIds.has(part.id) || !supportedCuratedIds.has(part.id)) continue;
  addDocument(part, part.id, part.colorEvidence.map(({ colorName }) => colorName));
}

const documents = [...documentsByKey.values()].sort((left, right) => left.componentId.localeCompare(right.componentId, "en"));
if (documents.length !== 2_726) throw new Error(`Expected 2,726 exact searchable parts, received ${documents.length}`);
const documentSource = `${documents.map(({ componentId, englishText }) => `${componentId}\t${englishText}`).join("\n")}\n`;
const orderedIdsContent = `${JSON.stringify(documents.map(({ componentId }) => componentId))}\n`;

env.localModelPath = `${modelCache}/`;
env.allowRemoteModels = false;
const extractor = await pipeline("feature-extraction", compact.exportRepository, { dtype: "int8", local_files_only: true });
const values = new Float32Array(documents.length * 384);
const batchSize = 96;
for (let offset = 0; offset < documents.length; offset += batchSize) {
  const batch = documents.slice(offset, offset + batchSize);
  const output = await extractor(batch.map(({ englishText }) => englishText), { pooling: "mean", normalize: true }) as unknown as EmbeddingOutput;
  if (output.dims[0] !== batch.length || output.dims[1] !== 384) throw new Error(`Unexpected embedding shape: ${output.dims.join("x")}`);
  values.set(output.data, offset * 384);
  console.log(`Embedded ${Math.min(offset + batchSize, documents.length)} / ${documents.length}`);
}
await extractor.dispose();

const indexBytes = serializeFloat32Le(values);
await write(resolve(profileRoot, "index.f32"), indexBytes);
await write(resolve(profileRoot, "ordered-component-ids.json"), orderedIdsContent);

for (const file of compact.files) {
  const source = resolve(modelCache, compact.exportRepository, file.path);
  const bytes = await readFile(source);
  if (bytes.byteLength !== file.byteLength || sha256(bytes) !== file.sha256) throw new Error(`Locked model file mismatch: ${file.path}`);
  await mkdir(dirname(resolve(outputRoot, "models", compact.exportRepository, file.path)), { recursive: true });
  await cp(source, resolve(outputRoot, "models", compact.exportRepository, file.path));
}
const runtimeFiles = ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"];
await mkdir(resolve(outputRoot, "runtime"), { recursive: true });
for (const file of runtimeFiles) {
  await cp(resolve(root, "node_modules/onnxruntime-web/dist", file), resolve(outputRoot, "runtime", file));
}

const assetEntries: Array<{ url: string; byteLength: number; sha256: string; kind: "model" | "tokenizer" | "runtime" | "index" | "mapping" }> = [];
const register = async (url: string, kind: "model" | "tokenizer" | "runtime" | "index" | "mapping"): Promise<void> => {
  const bytes = await readFile(resolve(root, `public${url}`));
  assetEntries.push({ url, byteLength: bytes.byteLength, sha256: sha256(bytes), kind });
};
await register("/search/compact-minilm/index.f32", "index");
await register("/search/compact-minilm/ordered-component-ids.json", "mapping");
for (const file of compact.files) {
  await register(`/search/models/${compact.exportRepository}/${file.path}`, file.path.includes("model_int8") ? "model" : "tokenizer");
}
for (const file of runtimeFiles) await register(`/search/runtime/${file}`, "runtime");

const manifest = semanticSearchReleaseSchema.parse({
  schemaVersion: 1,
  status: "beta-pending-human-relevance-review",
  sourcePolicy,
  profileId: "compact-minilm",
  modelId: compact.exportRepository,
  modelRevision: compact.modelRevision,
  runtimeVersion: "@huggingface/transformers@4.3.0",
  queryNormalizerVersion: "de-en-domain-v1",
  embeddingDimension: 384,
  documentCount: documents.length,
  documentsSha256: sha256(documentSource),
  orderedComponentIdsSha256: sha256(orderedIdsContent),
  indexSha256: sha256(indexBytes),
  requiredDownloadBytes: assetEntries.reduce((sum, { byteLength }) => sum + byteLength, 0),
  assets: assetEntries,
});
const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
await write(resolve(profileRoot, "manifest.json"), manifestContent);
await write(resolve(root, "data/generated/semantic-search-release.json"), manifestContent);
console.log(JSON.stringify({ message: "semantic search release generated", documentCount: documents.length, requiredDownloadBytes: manifest.requiredDownloadBytes, indexBytes: indexBytes.byteLength }));
