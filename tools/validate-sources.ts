import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sourceLockSchema } from "../src/contracts/source-lock.js";

const lockPath = resolve(process.cwd(), "data/sources.lock.json");
const raw = await readFile(lockPath, "utf8");
const parsed: unknown = JSON.parse(raw);
const lock = sourceLockSchema.parse(parsed);

const unresolved = lock.sources.flatMap((source) =>
  source.artifacts.filter(
    (artifact) =>
      artifact.downloadUrl === null || artifact.sha256 === null || artifact.retrievedAt === null,
  ),
);

console.log(
  JSON.stringify({
    message: "source lock valid",
    sourceCount: lock.sources.length,
    artifactCount: lock.sources[0].artifacts.length,
    unresolvedArtifactCount: unresolved.length,
    apiUsed: false,
    mocFilesAllowed: false,
  }),
);
