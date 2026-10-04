import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { sourceLockSchema, type SourceLock } from "../src/contracts/source-lock.js";
import {
  catalogSetSourceLockSchema,
  type CatalogSetSourceLock,
} from "../src/contracts/catalog-set-source-lock.js";
import { mergeCatalogSourceLocks } from "./catalog/merge-source-locks.js";
import {
  normalizeCatalogArtifacts,
  serializeSourceLock,
  type CatalogArtifactBytes,
} from "./catalog/normalize-catalog.js";
import {
  buildCatalogPackages,
  CATALOG_PACKAGE_FILE_BY_ROLE,
} from "./catalog/build-catalog-packages.js";

const ALLOWED_FILES = new Set([
  "colors.csv.gz",
  "part_categories.csv.gz",
  "parts.csv.gz",
  "part_relationships.csv.gz",
  "elements.csv.gz",
  "sets.csv.gz",
  "inventories.csv.gz",
  "inventory_parts.csv.gz",
  "inventory_minifigs.csv.gz",
  "minifigs.csv.gz",
]);
const MAX_ARTIFACT_BYTES = 64 * 1024 * 1024;

const { values } = parseArgs({
  options: {
    "check-only": { type: "boolean", default: false },
    refresh: { type: "boolean", default: false },
    "source-dir": { type: "string" },
  },
});

const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, "utf8")) as T;
const readLock = async (path: string): Promise<SourceLock> => sourceLockSchema.parse(await readJson<unknown>(path));
const readSetLock = async (path: string): Promise<CatalogSetSourceLock> =>
  catalogSetSourceLockSchema.parse(await readJson<unknown>(path));

const validateDownloadUrl = (fileName: string, downloadUrl: string): void => {
  const url = new URL(downloadUrl);
  if (url.protocol !== "https:" || url.hostname !== "cdn.rebrickable.com") {
    throw new Error(`Catalog URL for ${fileName} must use the Rebrickable CDN over HTTPS`);
  }
  if (url.pathname !== `/media/downloads/${fileName}` || url.search || url.hash) {
    throw new Error(`Catalog URL for ${fileName} is outside the explicit download allowlist`);
  }
  if (/moc|\/api\//iu.test(downloadUrl)) throw new Error(`MOC files and API URLs are forbidden: ${downloadUrl}`);
};

const fetchArtifact = async (fileName: string, downloadUrl: string): Promise<Uint8Array> => {
  validateDownloadUrl(fileName, downloadUrl);
  const response = await fetch(downloadUrl, { redirect: "error" });
  if (!response.ok) throw new Error(`Catalog download failed for ${fileName}: HTTP ${response.status}`);
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_ARTIFACT_BYTES) throw new Error(`Catalog download exceeds the size limit: ${fileName}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_ARTIFACT_BYTES) throw new Error(`Catalog download exceeds the size limit: ${fileName}`);
  return bytes;
};

const readArtifacts = async (lock: SourceLock): Promise<CatalogArtifactBytes[]> => {
  const source = lock.sources[0];
  const sourceDir = values["source-dir"];
  const artifacts: CatalogArtifactBytes[] = [];
  for (const artifact of source.artifacts) {
    if (!ALLOWED_FILES.has(artifact.fileName)) throw new Error(`Catalog artifact is not allowlisted: ${artifact.fileName}`);
    if (sourceDir) {
      artifacts.push({ fileName: artifact.fileName, bytes: new Uint8Array(await readFile(resolve(sourceDir, artifact.fileName))) });
    } else {
      if (!artifact.downloadUrl) throw new Error(`Catalog URL is missing: ${artifact.fileName}`);
      artifacts.push({ fileName: artifact.fileName, bytes: await fetchArtifact(artifact.fileName, artifact.downloadUrl) });
    }
  }
  return artifacts;
};

const generatedDir = resolve(process.cwd(), "data/generated");
const catalogPackagesDir = resolve(generatedDir, "catalog-packages");
const baselineLockPath = resolve(process.cwd(), "data/sources.lock.json");
const setBaselineLockPath = resolve(process.cwd(), "data/set-sources.lock.json");
const generatedLockPath = resolve(generatedDir, "catalog-source.lock.json");

if (values.refresh && values["check-only"]) throw new Error("Choose either --check-only or --refresh, not both");

if (!values.refresh) {
  const lock = mergeCatalogSourceLocks(
    await readLock(baselineLockPath),
    await readSetLock(setBaselineLockPath),
  );
  const unresolved = lock.sources[0].artifacts.filter(
    (artifact) => artifact.downloadUrl === null || artifact.sha256 === null || artifact.retrievedAt === null,
  );
  if (unresolved.length > 0) throw new Error("Source lock contains unresolved artifacts");
  console.log(JSON.stringify({ message: "catalog refresh boundary checked; no network request or file mutation performed", implementationTicket: "FF-08" }));
} else {
  let lock: SourceLock;
  try {
    await access(generatedLockPath);
    lock = await readLock(generatedLockPath);
  } catch {
    lock = mergeCatalogSourceLocks(
      await readLock(baselineLockPath),
      await readSetLock(setBaselineLockPath),
    );
  }
  const artifacts = await readArtifacts(lock);
  const result = normalizeCatalogArtifacts({
    sourceLock: lock,
    artifacts,
    allowHashUpdates: true,
    retrievedAt: new Date().toISOString(),
  });
  const catalogPackages = buildCatalogPackages(result.normalizedCatalog);
  await mkdir(generatedDir, { recursive: true });
  await mkdir(catalogPackagesDir, { recursive: true });
  await writeFile(generatedLockPath, serializeSourceLock(result.sourceLock), "utf8");
  await writeFile(resolve(generatedDir, "catalog-normalized.json"), `${JSON.stringify(result.normalizedCatalog, null, 2)}\n`, "utf8");
  await writeFile(resolve(generatedDir, "catalog-set-index.json"), `${JSON.stringify(result.catalogSetIndex)}\n`, "utf8");
  await writeFile(
    resolve(catalogPackagesDir, "manifest.json"),
    `${JSON.stringify(catalogPackages.manifest, null, 2)}\n`,
    "utf8",
  );
  for (const [role, catalogPackage] of Object.entries(catalogPackages.packages)) {
    await writeFile(
      resolve(catalogPackagesDir, CATALOG_PACKAGE_FILE_BY_ROLE[role as keyof typeof CATALOG_PACKAGE_FILE_BY_ROLE]),
      `${JSON.stringify(catalogPackage)}\n`,
      "utf8",
    );
  }
  await writeFile(
    resolve(generatedDir, "catalog-refresh-report.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      ticket: "FF-08",
      sourcePolicy: "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.",
      sourceLockUpdatedAt: result.sourceLock.updatedAt,
      changedArtifacts: result.changedArtifacts,
      normalizedPartCount: result.normalizedCatalog.parts.length,
      packagedMinifigPartCount: catalogPackages.manifest.includedPartCount,
      setIndex: result.catalogSetIndex.summary,
      catalogPackageCount: catalogPackages.manifest.packages.length,
      artifactCount: result.normalizedCatalog.artifacts.length,
      apiUsed: false,
      mocFilesAllowed: false,
    }, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify({ message: "catalog refresh normalized; generated outputs are ready for review", changedArtifacts: result.changedArtifacts, normalizedPartCount: result.normalizedCatalog.parts.length, packagedMinifigPartCount: catalogPackages.manifest.includedPartCount, setIndex: result.catalogSetIndex.summary, outputDirectory: "data/generated", apiUsed: false, mocFilesAllowed: false }));
}
