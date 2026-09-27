import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFile, rename, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import {
  fitHumanDecisionInputSchema,
  fitHumanReviewProgressSchema,
} from "../src/contracts/ldraw-fit-human-review.js";
import { ldrawFitReviewSchema } from "../src/contracts/ldraw-fit-review.js";
import {
  applyFitHumanDecision,
  buildFitHumanReviewExport,
  buildFitHumanReviewState,
  createFitHumanReviewProgress,
} from "./lib/ldraw-fit-human-review.js";

const host = "127.0.0.1";
const port = Number.parseInt(process.env.FIGFORGE_FIT_REVIEW_PORT ?? "4181", 10);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("FIGFORGE_FIT_REVIEW_PORT must be a valid TCP port");
}

const preflightPath = resolve("data/generated/ldraw-fit-review.json");
const thumbnailIndexPath = resolve("data/generated/ldraw-catalog-thumbnails.json");
const progressPath = resolve(
  process.env.FIGFORGE_FIT_REVIEW_PROGRESS ?? "data/review/ldraw-fit-human-progress.json",
);
const uiRoot = resolve("tools/fit-review-ui");
const [preflightRaw, thumbnailIndexRaw] = await Promise.all([
  readFile(preflightPath),
  readFile(thumbnailIndexPath, "utf8"),
]);
const sourcePreflightSha256 = createHash("sha256").update(preflightRaw).digest("hex");
const preflight = ldrawFitReviewSchema.parse(JSON.parse(preflightRaw.toString("utf8")) as unknown);
const thumbnailIndex = JSON.parse(thumbnailIndexRaw) as {
  entries: Array<{ componentId: string; status: "verified" | "blocked"; thumbnailUrl: string | null }>;
};
const thumbnailByComponent = new Map(
  thumbnailIndex.entries.flatMap((entry) =>
    entry.status === "verified" && entry.thumbnailUrl
      ? [[entry.componentId, entry.thumbnailUrl] as const]
      : [],
  ),
);

let progress = createFitHumanReviewProgress(sourcePreflightSha256);
try {
  const saved = fitHumanReviewProgressSchema.parse(JSON.parse(await readFile(progressPath, "utf8")) as unknown);
  if (saved.sourcePreflightSha256 !== sourcePreflightSha256) {
    throw new Error("Saved fit-review progress belongs to another preflight artifact");
  }
  progress = saved;
} catch (error) {
  const code = error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
  if (code !== "ENOENT") {
    throw error;
  }
}

const sendJson = (response: import("node:http").ServerResponse, status: number, value: unknown): void => {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(`${JSON.stringify(value)}\n`);
};

const readJsonBody = async (request: import("node:http").IncomingMessage): Promise<unknown> => {
  const body = await new Promise<string>((resolveBody, rejectBody) => {
    let content = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      content += chunk;
      if (Buffer.byteLength(content, "utf8") > 32_768) {
        rejectBody(new Error("Request body is too large"));
      }
    });
    request.on("end", () => resolveBody(content));
    request.on("error", rejectBody);
  });
  return JSON.parse(body) as unknown;
};

const saveProgress = async (): Promise<void> => {
  const temporaryPath = `${progressPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(progress, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, progressPath);
};

const staticFiles = new Map([
  ["/", resolve(uiRoot, "index.html")],
  ["/app.js", resolve(uiRoot, "app.js")],
  ["/styles.css", resolve(uiRoot, "styles.css")],
]);
for (const thumbnailUrl of thumbnailByComponent.values()) {
  if (!/^\/assets\/thumbnails\/ldraw\/[a-z0-9-]+\.svg$/u.test(thumbnailUrl)) {
    throw new Error(`Unsafe fit-review thumbnail path: ${thumbnailUrl}`);
  }
  staticFiles.set(thumbnailUrl, resolve(`public${thumbnailUrl}`));
}
const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

const handleRequest = async (
  request: import("node:http").IncomingMessage,
  response: import("node:http").ServerResponse,
): Promise<void> => {
  try {
    const requestUrl = new URL(request.url ?? "/", `http://${host}:${port}`);
    if (request.method === "GET" && requestUrl.pathname === "/api/state") {
      sendJson(response, 200, buildFitHumanReviewState(preflight, progress, thumbnailByComponent));
      return;
    }
    if (request.method === "POST" && requestUrl.pathname === "/api/review") {
      const input = fitHumanDecisionInputSchema.parse(await readJsonBody(request));
      progress = applyFitHumanDecision(preflight, progress, input, new Date());
      await saveProgress();
      sendJson(response, 200, buildFitHumanReviewState(preflight, progress, thumbnailByComponent));
      return;
    }
    if (request.method === "GET" && requestUrl.pathname === "/api/export") {
      const artifact = buildFitHumanReviewExport(preflight, progress);
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": "attachment; filename=ldraw-fit-human-review.json",
        "Cache-Control": "no-store",
      });
      response.end(`${JSON.stringify(artifact, null, 2)}\n`);
      return;
    }
    const staticPath = request.method === "GET" ? staticFiles.get(requestUrl.pathname) : undefined;
    if (staticPath) {
      const content = await readFile(staticPath);
      response.writeHead(200, {
        "Content-Type": contentTypes[extname(staticPath)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(content);
      return;
    }
    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fit-review server error";
    sendJson(response, message === "Human fit review is not complete" ? 409 : 400, { error: message });
  }
};

const server = createServer((request, response) => {
  void handleRequest(request, response);
});

server.listen(port, host, () => {
  console.log(`LDraw human fit review is available locally at http://${host}:${port}`);
  console.log(`Progress is stored in ${progressPath}`);
  console.log("The export remains non-publishable and cannot mutate FF-16 compatibility rules.");
});
