import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const wranglerDirectory = resolve(process.cwd(), ".wrangler");
const logDirectory = resolve(wranglerDirectory, "logs");
await mkdir(logDirectory, { recursive: true });

const wranglerBin = resolve(process.cwd(), "node_modules/wrangler/bin/wrangler.js");
const exitCode = await new Promise<number>((resolveExitCode, reject) => {
  const child = spawn(
    process.execPath,
    [wranglerBin, "deploy", "--dry-run", "--outdir", resolve(wranglerDirectory, "dry-run")],
    {
      env: {
        ...process.env,
        WRANGLER_LOG_PATH: resolve(logDirectory, "dry-run.log"),
      },
      stdio: "inherit",
    },
  );

  child.once("error", reject);
  child.once("exit", (code) => resolveExitCode(code ?? 1));
});

if (exitCode !== 0) {
  process.exitCode = exitCode;
}
