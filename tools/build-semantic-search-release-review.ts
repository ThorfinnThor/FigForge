import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { env, pipeline } from "@huggingface/transformers";
import { catalogPackageSchema, type CatalogPackagePart, type CatalogRole } from "../src/contracts/catalog-package.js";
import { ldrawRuntimePackageSchema } from "../src/contracts/ldraw-runtime-package.js";
import {
  semanticSearchReleaseReviewSchema,
  semanticSearchReviewQuerySetSchema,
} from "../src/contracts/semantic-search-review.js";
import { semanticSearchReleaseSchema } from "../src/contracts/semantic-search-release.js";
import { testAssortmentSchema } from "../src/contracts/test-assortment.js";
import { mergeSemanticCatalogResults, searchCatalog } from "../src/search/catalog-search.js";
import { normalizeSearchQuery } from "../src/search/normalize-query.js";
import { rankSemanticIndex } from "../src/search/semantic-index.js";

type EmbeddingOutput = { data: Float32Array; dims: number[] };
type ReviewComponent = CatalogPackagePart & { thumbnailUrl: string };
type ThumbnailEntry = {
  componentId: string;
  status: "verified" | "blocked";
  thumbnailUrl: string | null;
  geometryFallback?: Record<string, unknown> | null;
};

const root = process.cwd();
const updatedAt = "2026-10-01T16:30:00Z";
const querySetPath = resolve(root, "data/curated/semantic-search-release-review-queries.json");
const releaseManifestPath = resolve(root, "data/generated/semantic-search-release.json");
const outputPath = resolve(root, process.argv[2] ?? "data/review/semantic-search-release-review.json");
const sha256 = (content: Uint8Array | string): string => createHash("sha256").update(content).digest("hex");
const keyFor = (role: CatalogRole, partNum: string): string => `${role}:${partNum.toLowerCase()}`;
const roleFiles: Record<CatalogRole, string> = {
  head: "head",
  headwear: "headwear",
  torsoAssembly: "torso-assembly",
  legsAssembly: "legs-assembly",
  handAccessory: "hand-accessory",
};

const [querySetRaw, releaseManifestRaw, orderedIdsRaw, indexBytes, assortmentRaw, thumbnailsRaw, connectivityRaw] = await Promise.all([
  readFile(querySetPath),
  readFile(releaseManifestPath),
  readFile(resolve(root, "public/search/compact-minilm/ordered-component-ids.json")),
  readFile(resolve(root, "public/search/compact-minilm/index.f32")),
  readFile(resolve(root, "data/curated/ff03-test-assortment.json")),
  readFile(resolve(root, "data/generated/ldraw-catalog-thumbnails.json")),
  readFile(resolve(root, "data/generated/ldraw-digital-connectivity.json")),
]);
const querySet = semanticSearchReviewQuerySetSchema.parse(JSON.parse(querySetRaw.toString("utf8")) as unknown);
const releaseManifest = semanticSearchReleaseSchema.parse(JSON.parse(releaseManifestRaw.toString("utf8")) as unknown);
const orderedComponentIds = JSON.parse(orderedIdsRaw.toString("utf8")) as string[];
const assortment = testAssortmentSchema.parse(JSON.parse(assortmentRaw.toString("utf8")) as unknown);
const thumbnailDocument = JSON.parse(thumbnailsRaw.toString("utf8")) as { entries: ThumbnailEntry[] };
const connectivityDocument = JSON.parse(connectivityRaw.toString("utf8")) as { entries: Array<{ componentId: string; status: string }> };
if (releaseManifest.profileId !== "compact-minilm") {
  throw new Error("Release review requires the compact MiniLM release");
}

const curatedByKey = new Map(assortment.components.map((part) => [keyFor(part.role, part.rebrickablePartNum), part]));
const thumbnailByCuratedId = new Map(thumbnailDocument.entries.map((entry) => [entry.componentId, entry]));
const supportedCuratedIds = new Set(connectivityDocument.entries
  .filter(({ status }) => status === "digitally-supported")
  .map(({ componentId }) => componentId));
const exactCuratedIds = new Set(thumbnailDocument.entries
  .filter(({ status, thumbnailUrl, geometryFallback }) => status === "verified" && thumbnailUrl && geometryFallback == null)
  .map(({ componentId }) => componentId));
const componentByKey = new Map<string, ReviewComponent>();

for (const [role, fileName] of Object.entries(roleFiles) as Array<[CatalogRole, string]>) {
  const [catalogRaw, runtimeRaw] = await Promise.all([
    readFile(resolve(root, `data/generated/catalog-packages/${fileName}.json`)),
    readFile(resolve(root, `data/generated/ldraw-runtime/${fileName}.json`)),
  ]);
  const catalog = catalogPackageSchema.parse(JSON.parse(catalogRaw.toString("utf8")) as unknown);
  const runtime = ldrawRuntimePackageSchema.parse(JSON.parse(runtimeRaw.toString("utf8")) as unknown);
  const partByNumber = new Map(catalog.parts.map((part) => [part.rebrickablePartNum.toLowerCase(), part]));
  for (const entry of runtime.entries) {
    if (entry.geometryFallback !== null) continue;
    const part = partByNumber.get(entry.rebrickablePartNum.toLowerCase());
    if (!part) throw new Error(`Runtime entry has no catalog part: ${entry.componentId}`);
    const curated = curatedByKey.get(keyFor(role, part.rebrickablePartNum));
    const curatedThumbnail = curated ? thumbnailByCuratedId.get(curated.id) : undefined;
    componentByKey.set(keyFor(role, part.rebrickablePartNum), {
      id: curated?.id ?? part.id,
      role,
      rebrickablePartNum: part.rebrickablePartNum,
      name: curated?.name ?? part.name,
      rebrickableCategoryId: curated?.rebrickableCategoryId ?? part.rebrickableCategoryId,
      rebrickableCategoryName: curated?.rebrickableCategoryName ?? part.rebrickableCategoryName,
      material: curated?.material ?? part.material,
      colorNames: curated
        ? [...new Set(curated.colorEvidence.map(({ colorName }) => colorName))]
        : part.colorNames,
      thumbnailUrl: curatedThumbnail?.status === "verified" && curatedThumbnail.thumbnailUrl
        ? curatedThumbnail.thumbnailUrl
        : entry.thumbnailUrl,
    });
  }
}

for (const curated of assortment.components) {
  if (!exactCuratedIds.has(curated.id) || !supportedCuratedIds.has(curated.id)) continue;
  const thumbnail = thumbnailByCuratedId.get(curated.id);
  if (!thumbnail?.thumbnailUrl) throw new Error(`Exact curated component has no thumbnail: ${curated.id}`);
  componentByKey.set(keyFor(curated.role, curated.rebrickablePartNum), {
    id: curated.id,
    role: curated.role,
    rebrickablePartNum: curated.rebrickablePartNum,
    name: curated.name,
    rebrickableCategoryId: curated.rebrickableCategoryId,
    rebrickableCategoryName: curated.rebrickableCategoryName,
    material: curated.material,
    colorNames: [...new Set(curated.colorEvidence.map(({ colorName }) => colorName))],
    thumbnailUrl: thumbnail.thumbnailUrl,
  });
}

const componentById = new Map([...componentByKey.values()].map((component) => [component.id, component]));
const components = orderedComponentIds.map((componentId) => {
  const component = componentById.get(componentId);
  if (!component) throw new Error(`Release index component is missing review metadata: ${componentId}`);
  return component;
});
if (components.length !== releaseManifest.documentCount || new Set(components.map(({ id }) => id)).size !== components.length) {
  throw new Error("Release review component set does not match the release index");
}

const indexArrayBuffer = indexBytes.buffer.slice(indexBytes.byteOffset, indexBytes.byteOffset + indexBytes.byteLength);
const index = {
  profileId: "compact-minilm" as const,
  dimension: releaseManifest.embeddingDimension,
  orderedComponentIds,
  values: new Float32Array(indexArrayBuffer),
};
env.localModelPath = `${resolve(root, "public/search/models")}/`;
env.allowLocalModels = true;
env.allowRemoteModels = false;
const extractor = await pipeline("feature-extraction", releaseManifest.modelId, { dtype: "int8", local_files_only: true });
const queryTexts = querySet.cases.map(({ query }) => {
  const normalized = normalizeSearchQuery(query);
  return normalized.englishText || normalized.originalText;
});
const embedded = await extractor(queryTexts, { pooling: "mean", normalize: true }) as unknown as EmbeddingOutput;
await extractor.dispose();
if (embedded.dims[0] !== querySet.cases.length || embedded.dims[1] !== releaseManifest.embeddingDimension) {
  throw new Error(`Unexpected release review query shape: ${embedded.dims.join("x")}`);
}

const reviewCases = querySet.cases.map((reviewCase, caseIndex) => {
  const queryValues = embedded.data.slice(
    caseIndex * releaseManifest.embeddingDimension,
    (caseIndex + 1) * releaseManifest.embeddingDimension,
  );
  const semanticHits = rankSemanticIndex(index, { profileId: "compact-minilm", values: queryValues }, 400);
  const options = { category: reviewCase.role };
  const baseline = searchCatalog(components, reviewCase.query, options).results.slice(0, 5).map(({ component }) => component.id);
  const hybrid = mergeSemanticCatalogResults(components, reviewCase.query, semanticHits, options)
    .results.slice(0, 5).map(({ component }) => component.id);
  const candidateIds = [...new Set([...baseline, ...hybrid])]
    .sort((left, right) => sha256(`${reviewCase.caseId}:${left}`).localeCompare(sha256(`${reviewCase.caseId}:${right}`)));
  return {
    ...reviewCase,
    systems: { baseline, hybrid },
    candidates: candidateIds.map((componentId) => {
      const component = componentById.get(componentId);
      if (!component) throw new Error(`Unknown review candidate ${componentId}`);
      return {
        candidateKey: `candidate:${reviewCase.caseId}:${componentId}`,
        componentId,
        rebrickablePartNum: component.rebrickablePartNum,
        originalName: component.name,
        categoryRole: component.role,
        colorNames: component.colorNames,
        thumbnailUrl: component.thumbnailUrl,
        relevance: null,
      };
    }),
  };
});

const review = semanticSearchReleaseReviewSchema.parse({
  schemaVersion: 1,
  updatedAt,
  sourcePolicy: querySet.sourcePolicy,
  reviewStatus: "pending-human-review",
  blindedSystems: true,
  querySetSha256: sha256(querySetRaw),
  releaseManifestSha256: sha256(releaseManifestRaw),
  releaseProfileId: releaseManifest.profileId,
  releaseDocumentCount: releaseManifest.documentCount,
  instructions: "Bewerte jeden Treffer blind mit 0 (unpassend), 1 (akzeptabel) oder 2 (sehr passend). Maßgeblich sind Suchtext, sichtbare Geometrie, Katalogname, Kategorie und belegte Farbe. Die Herkunft aus Basis- oder Hybridsuche bleibt verborgen; der Holdout wird nicht ausgeliefert.",
  cases: reviewCases,
});
await writeFile(outputPath, `${JSON.stringify(review, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  message: "semantic search release relevance review generated",
  releaseDocumentCount: releaseManifest.documentCount,
  caseCount: review.cases.length,
  developmentCaseCount: review.cases.filter(({ split }) => split === "development").length,
  holdoutCaseCount: review.cases.filter(({ split }) => split === "holdout").length,
  developmentCandidateCount: review.cases
    .filter(({ split }) => split === "development")
    .reduce((sum, { candidates }) => sum + candidates.length, 0),
}));
