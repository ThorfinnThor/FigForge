import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFile, rename, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { relevanceReviewSchema } from "../src/contracts/search-profile.js";
import {
  applyDevelopmentRating,
  buildDevelopmentExport,
  buildDevelopmentState,
  createDevelopmentProgress,
  developmentProgressSchema,
  relevanceRatingSchema,
} from "./lib/ff18-review.js";

const host = "127.0.0.1";
const port = Number.parseInt(process.env.FIGFORGE_REVIEW_PORT ?? "4179", 10);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("FIGFORGE_REVIEW_PORT must be a valid TCP port");

const reviewPath = resolve(process.cwd(), "data/review/ff18-relevance-review.json");
const progressPath = resolve(
  process.cwd(),
  process.env.FIGFORGE_REVIEW_PROGRESS ?? "data/review/ff18-development-progress.json",
);
const uiRoot = resolve(process.cwd(), "tools/review-ui");
const reviewRaw = await readFile(reviewPath);
const sourceReviewSha256 = createHash("sha256").update(reviewRaw).digest("hex");
const review = relevanceReviewSchema.parse(JSON.parse(reviewRaw.toString("utf8")) as unknown);

let progress = createDevelopmentProgress(sourceReviewSha256);
try {
  const saved = developmentProgressSchema.parse(JSON.parse(await readFile(progressPath, "utf8")) as unknown);
  if (saved.sourceReviewSha256 !== sourceReviewSha256) {
    throw new Error("Saved progress belongs to another review artifact; move it aside before restarting");
  }
  progress = saved;
} catch (error) {
  const code = error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
  if (code !== "ENOENT") throw error;
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
      if (Buffer.byteLength(content, "utf8") > 16_384) rejectBody(new Error("Request body is too large"));
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
  ["/", "index.html"],
  ["/app.js", "app.js"],
  ["/styles.css", "styles.css"],
]);
const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const handleRequest = async (
  request: import("node:http").IncomingMessage,
  response: import("node:http").ServerResponse,
): Promise<void> => {
  try {
    const requestUrl = new URL(request.url ?? "/", `http://${host}:${port}`);
    if (request.method === "GET" && requestUrl.pathname === "/api/state") {
      sendJson(response, 200, buildDevelopmentState(review, progress));
      return;
    }
    if (request.method === "POST" && requestUrl.pathname === "/api/rating") {
      const body = await readJsonBody(request);
      if (!body || typeof body !== "object" || !("candidateKey" in body) || !("relevance" in body)) {
        sendJson(response, 400, { error: "candidateKey and relevance are required" });
        return;
      }
      const candidateKey = String(body.candidateKey);
      const relevance = relevanceRatingSchema.parse(body.relevance);
      progress = applyDevelopmentRating(review, progress, candidateKey, relevance, new Date());
      await saveProgress();
      sendJson(response, 200, buildDevelopmentState(review, progress));
      return;
    }
    if (request.method === "GET" && requestUrl.pathname === "/api/export") {
      const artifact = buildDevelopmentExport(review, progress);
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": "attachment; filename=ff18-development-review.json",
        "Cache-Control": "no-store",
      });
      response.end(`${JSON.stringify(artifact, null, 2)}\n`);
      return;
    }
    const staticName = request.method === "GET" ? staticFiles.get(requestUrl.pathname) : undefined;
    if (staticName) {
      const content = await readFile(resolve(uiRoot, staticName));
      response.writeHead(200, {
        "Content-Type": contentTypes[extname(staticName)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(content);
      return;
    }
    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown review server error";
    sendJson(response, message === "Development review is not complete" ? 409 : 400, { error: message });
  }
};

const server = createServer((request, response) => {
  void handleRequest(request, response);
});

server.listen(port, host, () => {
  console.log(`FF-18 review is available locally at http://${host}:${port}`);
  console.log(`Progress is stored in ${progressPath}`);
  console.log("Only development cases are exposed; holdout cases remain hidden.");
});
