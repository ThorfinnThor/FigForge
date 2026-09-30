import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { decideLDrawLockUpdate, releaseFromArchiveEntries } from "./lib/ldraw-release.js";

const root = process.cwd();
const offline = process.argv.includes("--offline");
const lockPath = resolve(root, "data/ldraw-source.lock.json");
const incomingRoot = resolve(root, "data/incoming/ldraw-official");
const archivePath = resolve(incomingRoot, "complete.zip");
const downloadPath = resolve(incomingRoot, "download.zip");
const extractedRoot = resolve(incomingRoot, "extracted");

type SourceLock = { release: string; archiveUrl: string; archiveSha256: string; contentPolicy: string } & Record<string, unknown>;

const sha256 = (content: Buffer): string => createHash("sha256").update(content).digest("hex");
const lock = JSON.parse(await readFile(lockPath, "utf8")) as SourceLock;
if (!lock.archiveUrl.startsWith("https://library.ldraw.org/")) throw new Error("LDraw archive must come from library.ldraw.org");
if (!lock.contentPolicy.includes("MOC files are excluded")) throw new Error("LDraw source lock must explicitly exclude MOC files");
await mkdir(incomingRoot, { recursive: true });

let decision: ReturnType<typeof decideLDrawLockUpdate> = { action: "unchanged" };
if (offline) {
  if (sha256(await readFile(archivePath)) !== lock.archiveSha256) throw new Error("Local LDraw archive does not match the lock");
} else {
  execFileSync("curl", ["--fail", "--location", "--silent", "--show-error", "--retry", "3", "--output", downloadPath, lock.archiveUrl], {
    stdio: "inherit",
  });
  const entries = execFileSync("unzip", ["-Z1", downloadPath], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).split("\n");
  if (entries.some((entry) => entry.includes("..") || entry.startsWith("/"))) throw new Error("Unsafe path in LDraw archive");
  decision = decideLDrawLockUpdate(lock, {
    release: releaseFromArchiveEntries(entries),
    archiveSha256: sha256(await readFile(downloadPath)),
  });
  await rename(downloadPath, archivePath);
  if (decision.action === "update") {
    await writeFile(
      lockPath,
      `${JSON.stringify({ ...lock, release: decision.release, archiveSha256: decision.archiveSha256 }, null, 2)}\n`,
      "utf8",
    );
  }
}

await rm(extractedRoot, { force: true, recursive: true });
await mkdir(extractedRoot, { recursive: true });
execFileSync("unzip", ["-q", archivePath, "-d", extractedRoot], { stdio: "inherit" });
await access(resolve(extractedRoot, "ldraw/parts"));
await access(resolve(extractedRoot, "ldraw/LDConfig.ldr"));
console.log(JSON.stringify({
  message: "official LDraw library prepared",
  action: decision.action,
  release: decision.action === "update" ? decision.release : lock.release,
  mocFilesUsed: 0,
}));
