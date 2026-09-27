import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { relevanceReviewSchema, searchIndexManifestSchema, searchModelLockSchema, searchProfileSchema } from "../src/contracts/search-profile.js";
import { searchDocumentsSchema } from "../src/contracts/search-ff21.js";
import documentsJson from "../data/curated/ff21-search-documents.json" with { type: "json" };
import modelLockJson from "../data/search-models.lock.json" with { type: "json" };
import manifestJson from "../data/generated/search-indices/manifest.json" with { type: "json" };
import compactProfileJson from "../data/generated/search-indices/compact-minilm/search-profile.json" with { type: "json" };
import qualityProfileJson from "../data/generated/search-indices/quality-e5/search-profile.json" with { type: "json" };
import reviewJson from "../data/review/ff18-relevance-review.json" with { type: "json" };

const sha256 = (content: Uint8Array | string): string => createHash("sha256").update(content).digest("hex");
const documents = searchDocumentsSchema.parse(documentsJson);
const modelLock = searchModelLockSchema.parse(modelLockJson);
const manifest = searchIndexManifestSchema.parse(manifestJson);
const review = relevanceReviewSchema.parse(reviewJson);
const profiles = [searchProfileSchema.parse(compactProfileJson), searchProfileSchema.parse(qualityProfileJson)];
const documentsSha256 = sha256(await readFile(resolve(process.cwd(), "data/curated/ff21-search-documents.json")));

if (new Set(profiles.map(({ profileId }) => profileId)).size !== 2) throw new Error("FF-18 requires two distinct profile manifests");
if (new Set(profiles.map(({ indexSha256 }) => indexSha256)).size !== 2) throw new Error("FF-18 profile indices must not be identical");
if (modelLock.runtimeVersion !== "4.3.0") throw new Error("FF-18 runtime lock drifted");

for (const profile of profiles) {
  const manifestEntry = manifest.profiles.find(({ profileId }) => profileId === profile.profileId);
  const lockProfile = modelLock.profiles.find(({ profileId }) => profileId === profile.profileId);
  if (!manifestEntry || !lockProfile) throw new Error(`${profile.profileId}: manifest or model lock missing`);
  if (profile.catalogVersion !== documentsSha256) throw new Error(`${profile.profileId}: document hash mismatch`);
  if (profile.modelRevision !== lockProfile.modelRevision) throw new Error(`${profile.profileId}: model revision mismatch`);
  const profileBytes = await readFile(resolve(process.cwd(), manifestEntry.profilePath));
  const indexBytes = await readFile(resolve(process.cwd(), manifestEntry.indexPath));
  if (sha256(profileBytes) !== manifestEntry.profileSha256) throw new Error(`${profile.profileId}: profile hash mismatch`);
  if (sha256(indexBytes) !== profile.indexSha256 || profile.indexSha256 !== manifestEntry.indexSha256) throw new Error(`${profile.profileId}: index hash mismatch`);
  if (indexBytes.byteLength !== profile.indexByteLength || indexBytes.byteLength !== documents.documents.length * 384 * Float32Array.BYTES_PER_ELEMENT) {
    throw new Error(`${profile.profileId}: index byte length mismatch`);
  }
  const view = new DataView(indexBytes.buffer, indexBytes.byteOffset, indexBytes.byteLength);
  for (let documentIndex = 0; documentIndex < documents.documents.length; documentIndex += 1) {
    let squaredNorm = 0;
    for (let dimensionIndex = 0; dimensionIndex < 384; dimensionIndex += 1) {
      const value = view.getFloat32((documentIndex * 384 + dimensionIndex) * Float32Array.BYTES_PER_ELEMENT, true);
      squaredNorm += value * value;
    }
    const norm = Math.sqrt(squaredNorm);
    if (Math.abs(norm - 1) > 0.0001) throw new Error(`${profile.profileId}: document ${documentIndex} is not L2-normalized (${norm})`);
  }
}

if (review.reviewStatus !== "pending-human-review" || review.cases.some(({ candidates }) => candidates.some(({ relevance }) => relevance !== null))) {
  throw new Error("FF-18 review worksheet must remain unlabeled until a human completes it");
}

console.log(JSON.stringify({
  message: "FF-18 model locks, separate FP32 indices and blind review worksheet valid",
  runtimeVersion: modelLock.runtimeVersion,
  documentCount: documents.documents.length,
  profileCount: profiles.length,
  profiles: profiles.map(({ profileId, indexSha256, indexByteLength }) => ({ profileId, indexSha256, indexByteLength })),
  reviewCaseCount: review.cases.length,
  reviewCandidateCount: review.cases.reduce((total, { candidates }) => total + candidates.length, 0),
  decisionStatus: manifest.decisionStatus,
  humanRelevanceLabelsPresent: false,
  sourcePolicy: manifest.sourcePolicy,
}));
