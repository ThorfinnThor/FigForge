import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sourceLockSchema } from "../src/contracts/source-lock.js";
import { catalogSetSourceLockSchema } from "../src/contracts/catalog-set-source-lock.js";

const lockPath = resolve(process.cwd(), "data/sources.lock.json");
const setLockPath = resolve(process.cwd(), "data/set-sources.lock.json");
const raw = await readFile(lockPath, "utf8");
const parsed: unknown = JSON.parse(raw);
const lock = sourceLockSchema.parse(parsed);
const setLock = catalogSetSourceLockSchema.parse(
  JSON.parse(await readFile(setLockPath, "utf8")) as unknown,
);

const unresolved = lock.sources.flatMap((source) =>
  source.artifacts.filter(
    (artifact) =>
      artifact.downloadUrl === null || artifact.sha256 === null || artifact.retrievedAt === null,
  ),
);
const setUnresolved = setLock.sources.flatMap((source) =>
  source.artifacts.filter(
    (artifact) => !artifact.downloadUrl || !artifact.sha256 || !artifact.retrievedAt,
  ),
);

console.log(
  JSON.stringify({
    message: "source lock valid",
    sourceCount: lock.sources.length,
    artifactCount: lock.sources[0].artifacts.length + setLock.sources[0].artifacts.length,
    unresolvedArtifactCount: unresolved.length + setUnresolved.length,
    apiUsed: false,
    mocFilesAllowed: false,
  }),
);
