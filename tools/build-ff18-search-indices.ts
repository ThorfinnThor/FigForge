import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { env, pipeline } from "@huggingface/transformers";
import { relevanceReviewSchema, searchIndexManifestSchema, searchModelLockSchema, searchProfileSchema } from "../src/contracts/search-profile.js";
import { searchDocumentsSchema, searchTestsetSchema } from "../src/contracts/search-ff21.js";
import { testAssortmentSchema } from "../src/contracts/test-assortment.js";
import { searchCatalog } from "../src/search/catalog-search.js";
import { normalizeSearchQuery } from "../src/search/normalize-query.js";
import { rankSemanticIndex } from "../src/search/semantic-index.js";
import type { SearchProfileId, SemanticIndex } from "../src/search/semantic-index.js";
import documentsJson from "../data/curated/ff21-search-documents.json" with { type: "json" };
import testsetJson from "../data/curated/ff21-search-testset.json" with { type: "json" };
import modelLockJson from "../data/search-models.lock.json" with { type: "json" };
import assortmentJson from "../data/curated/ff03-test-assortment.json" with { type: "json" };

interface EmbeddingOutput {
  data: Float32Array;
  dims: number[];
}

const updatedAt = "2026-09-27T17:30:00Z";
const sourcePolicy = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;
const documents = searchDocumentsSchema.parse(documentsJson);
const testset = searchTestsetSchema.parse(testsetJson);
const modelLock = searchModelLockSchema.parse(modelLockJson);
const assortment = testAssortmentSchema.parse(assortmentJson);
const modelCache = process.env.FIGFORGE_MODEL_CACHE ?? resolve(process.cwd(), "../../work/hf-local");
const generatedRoot = resolve(process.cwd(), "data/generated/search-indices");
env.localModelPath = `${modelCache}/`;
env.allowRemoteModels = false;

const sha256 = (content: Uint8Array | string): string => createHash("sha256").update(content).digest("hex");
const serializeFloat32Le = (values: Float32Array): Uint8Array => {
  const output = new Uint8Array(values.length * Float32Array.BYTES_PER_ELEMENT);
  const view = new DataView(output.buffer);
  values.forEach((value, index) => view.setFloat32(index * Float32Array.BYTES_PER_ELEMENT, value, true));
  return output;
};
const writeJson = async (path: string, value: unknown): Promise<string> => {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  return content;
};

for (const profile of modelLock.profiles) {
  for (const file of profile.files) {
    const localPath = resolve(modelCache, profile.exportRepository, file.path);
    const [bytes, fileStat] = await Promise.all([readFile(localPath), stat(localPath)]);
    if (fileStat.size !== file.byteLength || sha256(bytes) !== file.sha256) {
      throw new Error(`${profile.profileId}: local model file does not match lock: ${file.path}`);
    }
  }
}

const documentIds = documents.documents.map(({ componentId }) => componentId);
const orderedIdsSha256 = sha256(`${documentIds.join("\n")}\n`);
const documentsSha256 = sha256(await readFile(resolve(process.cwd(), "data/curated/ff21-search-documents.json")));
const componentById = new Map(assortment.components.map((component) => [component.id, component]));
const indexByProfile = new Map<SearchProfileId, SemanticIndex>();
const profileManifestEntries: Array<{ profileId: SearchProfileId; profilePath: string; indexPath: string; profileSha256: string; indexSha256: string }> = [];
const queryEmbeddings = new Map<SearchProfileId, Float32Array>();

for (const lockProfile of modelLock.profiles) {
  const profileId = lockProfile.profileId;
  const documentPrefix = profileId === "quality-e5" ? "passage: " : "";
  const queryPrefix = profileId === "quality-e5" ? "query: " : "";
  const extractor = await pipeline("feature-extraction", lockProfile.exportRepository, { dtype: "int8" });
  const documentOutput = await extractor(
    documents.documents.map(({ englishText }) => `${documentPrefix}${englishText}`),
    { pooling: "mean", normalize: true },
  ) as unknown as EmbeddingOutput;
  if (documentOutput.dims[0] !== documents.documents.length || documentOutput.dims[1] !== 384) {
    throw new Error(`${profileId}: unexpected document embedding shape ${documentOutput.dims.join("x")}`);
  }
  const queryTexts = testset.cases.map(({ query }) => {
    if (profileId === "quality-e5") return `${queryPrefix}${query}`;
    const normalized = normalizeSearchQuery(query);
    return normalized.englishText.length > 0 ? normalized.englishText : normalized.originalText;
  });
  const queryOutput = await extractor(queryTexts, { pooling: "mean", normalize: true }) as unknown as EmbeddingOutput;
  if (queryOutput.dims[0] !== testset.cases.length || queryOutput.dims[1] !== 384) {
    throw new Error(`${profileId}: unexpected query embedding shape ${queryOutput.dims.join("x")}`);
  }
  await extractor.dispose();
  const indexBytes = serializeFloat32Le(documentOutput.data);
  const indexSha256 = sha256(indexBytes);
  const profileDirectory = resolve(generatedRoot, profileId);
  const indexPath = resolve(profileDirectory, "index.f32");
  await mkdir(profileDirectory, { recursive: true });
  await writeFile(indexPath, indexBytes);
  const tokenizer = lockProfile.files.find(({ path }) => path === "tokenizer.json");
  const onnx = lockProfile.files.find(({ path }) => path === "onnx/model_int8.onnx");
  if (!tokenizer || !onnx) throw new Error(`${profileId}: required model or tokenizer lock missing`);
  const profile = searchProfileSchema.parse({
    profileId,
    schemaVersion: 1,
    catalogVersion: documentsSha256,
    upstreamModelId: lockProfile.upstreamModelId,
    exportRepository: lockProfile.exportRepository,
    modelRevision: lockProfile.modelRevision,
    onnxSha256: onnx.sha256,
    runtimeVersion: "@huggingface/transformers@4.3.0",
    tokenizerRevision: lockProfile.modelRevision,
    tokenizerSha256: tokenizer.sha256,
    quantization: "int8",
    embeddingDimension: 384,
    pooling: "mean-with-attention-mask",
    normalize: true,
    maxTokens: profileId === "compact-minilm" ? 256 : 512,
    queryPrefix,
    documentPrefix,
    queryNormalizerVersion: profileId === "compact-minilm" ? "de-en-domain-v1" : "direct-multilingual-v1",
    documentSchemaVersion: documents.documentSchemaVersion,
    indexDtype: "float32-le",
    indexSha256,
    orderedVariantIdsSha256: orderedIdsSha256,
    documentCount: documents.documents.length,
    indexByteLength: indexBytes.byteLength,
    requiredFiles: lockProfile.files,
  });
  const profilePath = resolve(profileDirectory, "search-profile.json");
  const profileContent = await writeJson(profilePath, profile);
  profileManifestEntries.push({
    profileId,
    profilePath: `data/generated/search-indices/${profileId}/search-profile.json`,
    indexPath: `data/generated/search-indices/${profileId}/index.f32`,
    profileSha256: sha256(profileContent),
    indexSha256,
  });
  indexByProfile.set(profileId, { profileId, dimension: 384, orderedComponentIds: documentIds, values: documentOutput.data });
  queryEmbeddings.set(profileId, queryOutput.data);
}

const manifest = searchIndexManifestSchema.parse({
  schemaVersion: 1,
  ticket: "FF-18",
  updatedAt,
  sourcePolicy,
  profiles: profileManifestEntries,
  decisionStatus: "blocked-pending-human-relevance-review",
});
await writeJson(resolve(generatedRoot, "manifest.json"), manifest);

const reviewCases = testset.cases.map((testCase, caseIndex) => {
  const candidateIds = new Set<string>(searchCatalog(assortment.components, testCase.query).results.slice(0, 5).map(({ component }) => component.id));
  for (const profileId of ["compact-minilm", "quality-e5"] as const) {
    const index = indexByProfile.get(profileId);
    const allQueries = queryEmbeddings.get(profileId);
    if (!index || !allQueries) throw new Error(`${profileId}: index/query embeddings missing`);
    const offset = caseIndex * 384;
    const queryValues = allQueries.slice(offset, offset + 384);
    for (const hit of rankSemanticIndex(index, { profileId, values: queryValues }, 5)) candidateIds.add(hit.componentId);
  }
  const sortedIds = [...candidateIds].sort((left, right) => sha256(`${testCase.id}:${left}`).localeCompare(sha256(`${testCase.id}:${right}`)));
  return {
    caseId: testCase.id,
    split: testCase.split,
    query: testCase.query,
    candidates: sortedIds.map((componentId) => {
      const component = componentById.get(componentId);
      if (!component) throw new Error(`Unknown review candidate ${componentId}`);
      return {
        candidateKey: `candidate:${testCase.id}:${componentId}`,
        componentId,
        rebrickablePartNum: component.rebrickablePartNum,
        originalName: component.name,
        categoryRole: component.role,
        colorName: component.colorEvidence[0]?.colorName ?? "Unknown",
        relevance: null,
      };
    }),
  };
});
const review = relevanceReviewSchema.parse({
  schemaVersion: 1,
  ticket: "FF-18",
  updatedAt,
  instructions: "Ein Mensch bewertet jeden Kandidaten blind mit 0 (irrelevant), 1 (akzeptabel) oder 2 (hoch relevant). Systemherkunft nicht ergänzen. Holdout erst nach Abschluss der Entwicklungsabstimmung bewerten; keine E5-Ergebnisse als Wahrheit verwenden.",
  blindedSystems: true,
  reviewStatus: "pending-human-review",
  cases: reviewCases,
});
await writeJson(resolve(process.cwd(), "data/review/ff18-relevance-review.json"), review);

console.log(JSON.stringify({
  message: "FF-18 separate search indices and blinded relevance worksheet generated",
  profiles: profileManifestEntries.map(({ profileId, indexSha256 }) => ({ profileId, indexSha256 })),
  documentCount: documents.documents.length,
  embeddingDimension: 384,
  indexByteLength: documents.documents.length * 384 * Float32Array.BYTES_PER_ELEMENT,
  reviewCaseCount: reviewCases.length,
  decisionStatus: manifest.decisionStatus,
}));
