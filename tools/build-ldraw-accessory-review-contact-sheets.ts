import { spawn, type ChildProcess } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import sharp from "sharp";
import { preview, type PreviewServer } from "vite";
import { ldrawAccessoryOrientationReviewSchema } from "../src/contracts/ldraw-accessory-orientation-review.js";
import {
  createRiskReviewGroups,
  type AccessoryOrientationReviewEntry as ReviewEntry,
  type AccessoryOrientationReviewGroup as ReviewGroup,
} from "./lib/ldraw-accessory-review-batches.js";

const root = process.cwd();
const queuePath = resolve(root, "data/generated/ldraw-accessory-orientation-review.json");
const DEFAULT_BATCH_SIZE = 12;
const PARTS_PER_SHEET = 4;
const TILE_WIDTH = 420;
const TILE_HEIGHT = 390;
const LABEL_HEIGHT = 64;
const CAPTURE_TIMEOUT_MS = 30_000;

type CdpMessage = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { message?: string };
};

class CdpClient {
  readonly #socket: WebSocket;
  readonly #pending = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
  }>();
  #nextId = 1;

  private constructor(socket: WebSocket) {
    this.#socket = socket;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage;
      if (message.id === undefined) return;
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message ?? "CDP command failed"));
      else pending.resolve(message.result);
    });
  }

  static async connect(url: string): Promise<CdpClient> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolveSocket, reject) => {
      socket.addEventListener("open", () => resolveSocket(), { once: true });
      socket.addEventListener("error", () => reject(new Error("Could not connect to Chrome DevTools")), { once: true });
    });
    return new CdpClient(socket);
  }

  async send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.#nextId;
    this.#nextId += 1;
    const result = new Promise<unknown>((resolveCommand, reject) => {
      this.#pending.set(id, { resolve: resolveCommand, reject });
    });
    this.#socket.send(JSON.stringify({ id, method, params }));
    return await result as T;
  }

  close(): void {
    this.#socket.close();
  }
}

type RuntimeResult<T> = {
  result: { value?: T; description?: string };
  exceptionDetails?: { text?: string; exception?: { description?: string } };
};

const evaluate = async <T>(client: CdpClient, expression: string): Promise<T> => {
  const response = await client.send<RuntimeResult<T>>("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description
      ?? response.exceptionDetails.text
      ?? "Browser evaluation failed");
  }
  return response.result.value as T;
};

const waitFor = async (client: CdpClient, expression: string, label: string): Promise<void> => {
  const deadline = Date.now() + CAPTURE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await evaluate<boolean>(client, expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const freePort = async (): Promise<number> => await new Promise((resolvePort, reject) => {
  const server = createNetServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      reject(new Error("Could not reserve a browser debugging port"));
      return;
    }
    server.close((error) => error ? reject(error) : resolvePort(address.port));
  });
});

const findChrome = async (): Promise<string> => {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.GOOGLE_CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next standard path.
    }
  }
  throw new Error("Chrome/Chromium not found. Set CHROME_BIN to build accessory review contact sheets.");
};

const waitForJson = async <T>(url: string, chrome: ChildProcess, stderr: () => string): Promise<T> => {
  const deadline = Date.now() + CAPTURE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (chrome.exitCode !== null) {
      throw new Error(`Chrome exited with code ${chrome.exitCode}${stderr() ? `: ${stderr()}` : ""}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json() as T;
    } catch {
      // Chrome is still starting.
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${url}${stderr() ? `: ${stderr()}` : ""}`);
};

const launchChrome = async (): Promise<{
  process: ChildProcess;
  profileDirectory: string;
  debuggingOrigin: string;
}> => {
  const executable = await findChrome();
  const port = await freePort();
  const profileDirectory = await mkdtemp(join(tmpdir(), "figforge-accessory-review-"));
  const args = [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDirectory}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--window-size=1440,1000",
    "about:blank",
  ];
  if (process.platform === "linux") args.unshift("--no-sandbox");
  const chrome = spawn(executable, args, { stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  chrome.stderr?.on("data", (chunk: Buffer) => {
    stderr = `${stderr}${chunk.toString("utf8")}`.slice(-4_000);
  });
  const debuggingOrigin = `http://127.0.0.1:${port}`;
  try {
    await waitForJson(`${debuggingOrigin}/json/version`, chrome, () => stderr.trim());
  } catch (error) {
    chrome.kill("SIGTERM");
    await rm(profileDirectory, { force: true, recursive: true });
    throw error;
  }
  return { process: chrome, profileDirectory, debuggingOrigin };
};

const stopChrome = async (chrome: ChildProcess): Promise<void> => {
  if (chrome.exitCode !== null) return;
  const exited = new Promise<void>((resolveExit) => chrome.once("exit", () => resolveExit()));
  chrome.kill("SIGTERM");
  await Promise.race([exited, delay(2_000)]);
  if (chrome.exitCode === null) {
    chrome.kill("SIGKILL");
    await Promise.race([exited, delay(2_000)]);
  }
};

const createPage = async (debuggingOrigin: string): Promise<CdpClient> => {
  const response = await fetch(`${debuggingOrigin}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" });
  if (!response.ok) throw new Error(`Could not create Chrome target (${response.status})`);
  const target = await response.json() as { webSocketDebuggerUrl?: string };
  if (!target.webSocketDebuggerUrl) throw new Error("Chrome target has no debugger WebSocket");
  const client = await CdpClient.connect(target.webSocketDebuggerUrl);
  await Promise.all([client.send("Page.enable"), client.send("Runtime.enable")]);
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  return client;
};

const navigate = async (client: CdpClient, url: string): Promise<void> => {
  await client.send("Page.navigate", { url: "about:blank" });
  await waitFor(client, "document.readyState === 'complete'", "blank page reset");
  await client.send("Page.navigate", { url });
  await waitFor(client, "document.readyState === 'complete'", `page ${url}`);
};

const startPreview = async (): Promise<{ server: PreviewServer; origin: string }> => {
  const server = await preview({
    logLevel: "error",
    preview: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  const address = server.httpServer.address();
  if (!address || typeof address === "string") {
    await server.close();
    throw new Error("Vite did not expose a local TCP address");
  }
  return { server, origin: `http://127.0.0.1:${address.port}` };
};

const readPositiveIntegerFlag = (name: string, fallback: number): number => {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
};

const readStringFlag = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1] ?? fallback;
};

const escapeXml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const reviewUrl = (origin: string, componentId: string): string => {
  const document = {
    schemaVersion: 2,
    kind: "figforge-figure",
    name: "Accessory batch review",
    updatedAt: "2026-10-12T00:00:00.000Z",
    selections: [
      { slot: "head", componentId: "catalog:head:3626bpr0410" },
      { slot: "torsoAssembly", componentId: "catalog:torsoAssembly:973c01h01pr0006" },
      { slot: "legsAssembly", componentId: "catalog:legsAssembly:970c01pr0285" },
      { slot: "handAccessory", componentId },
    ],
  };
  const payload = Buffer.from(JSON.stringify(document), "utf8").toString("base64url");
  return `${origin}/#figforge=v2.${payload}`;
};

const captureViewport = async (client: CdpClient): Promise<Buffer> => {
  const clip = await evaluate<{ x: number; y: number; width: number; height: number }>(client, `(() => {
    const element = document.querySelector('.viewport-shell');
    if (!(element instanceof HTMLElement)) throw new Error('Viewport shell missing');
    const rectangle = element.getBoundingClientRect();
    return { x: rectangle.x, y: rectangle.y, width: rectangle.width, height: rectangle.height };
  })()`);
  const screenshot = await client.send<{ data: string }>("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    clip: { ...clip, scale: 1 },
  });
  return Buffer.from(screenshot.data, "base64");
};

const labelTile = async (image: Buffer, entry: ReviewEntry, view: string): Promise<Buffer> => {
  const resized = await sharp(image)
    .resize(TILE_WIDTH, TILE_HEIGHT - LABEL_HEIGHT, { fit: "cover", position: "center" })
    .png()
    .toBuffer();
  const title = `${entry.rebrickablePartNum} · ${view}`;
  const subtitle = entry.name.length > 58 ? `${entry.name.slice(0, 55)}…` : entry.name;
  const label = Buffer.from(`<svg width="${TILE_WIDTH}" height="${LABEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#fffaf2"/>
    <text x="14" y="25" font-family="Arial, sans-serif" font-weight="700" font-size="18" fill="#1d294f">${escapeXml(title)}</text>
    <text x="14" y="48" font-family="Arial, sans-serif" font-size="13" fill="#555f79">${escapeXml(subtitle)}</text>
  </svg>`);
  return await sharp({
    create: { width: TILE_WIDTH, height: TILE_HEIGHT, channels: 4, background: "#fffaf2" },
  }).composite([
    { input: label, left: 0, top: 0 },
    { input: resized, left: 0, top: LABEL_HEIGHT },
  ]).png().toBuffer();
};

const composeSheet = async (tiles: Buffer[], outputPath: string): Promise<void> => {
  const rows = Math.ceil(tiles.length / 3);
  await sharp({
    create: {
      width: TILE_WIDTH * 3,
      height: TILE_HEIGHT * rows,
      channels: 4,
      background: "#c08c59",
    },
  }).composite(tiles.map((input, index) => ({
    input,
    left: index % 3 * TILE_WIDTH,
    top: Math.floor(index / 3) * TILE_HEIGHT,
  }))).webp({ quality: 88 }).toFile(outputPath);
};

const run = async (): Promise<void> => {
  const batchNumber = readPositiveIntegerFlag("--batch", 1);
  const batchSize = readPositiveIntegerFlag("--size", DEFAULT_BATCH_SIZE);
  const outputDirectory = resolve(root, readStringFlag("--output", "artifacts/accessory-review"));
  const queue = ldrawAccessoryOrientationReviewSchema.parse(JSON.parse(await readFile(queuePath, "utf8")) as unknown);
  const groups = createRiskReviewGroups(queue.entries);
  const batch = groups.slice((batchNumber - 1) * batchSize, batchNumber * batchSize);
  if (batch.length === 0) throw new Error(`Accessory review batch ${batchNumber} is empty`);
  await mkdir(outputDirectory, { recursive: true });

  const previewServer = await startPreview();
  let chrome: Awaited<ReturnType<typeof launchChrome>> | null = null;
  let client: CdpClient | null = null;
  const captured: Array<{ group: ReviewGroup; tiles: Buffer[] }> = [];
  try {
    chrome = await launchChrome();
    client = await createPage(chrome.debuggingOrigin);
    for (const group of batch) {
      const entry = group.representative;
      await navigate(client, reviewUrl(previewServer.origin, entry.componentId));
      await waitFor(
        client,
        "Boolean(document.querySelector('.scene-lab[data-scene-state=\"ready\"][data-selection-state=\"synchronized\"] canvas.viewport'))",
        `synchronized preview for ${entry.rebrickablePartNum}`,
      );
      const tiles: Buffer[] = [];
      for (const [viewIndex, view] of ["three-quarter", "front", "back"].entries()) {
        const selected = await evaluate<boolean>(client, `(() => {
          const button = document.querySelectorAll('.camera-button')[${viewIndex}];
          if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
          button.click();
          return true;
        })()`);
        if (!selected) throw new Error(`Could not select ${view} for ${entry.rebrickablePartNum}`);
        await delay(180);
        tiles.push(await labelTile(await captureViewport(client), entry, view));
      }
      captured.push({ group, tiles });
      process.stdout.write(`✓ ${entry.rebrickablePartNum} (${group.members.length} family member(s))\n`);
    }

    for (let offset = 0; offset < captured.length; offset += PARTS_PER_SHEET) {
      const page = captured.slice(offset, offset + PARTS_PER_SHEET);
      const pageNumber = Math.floor(offset / PARTS_PER_SHEET) + 1;
      await composeSheet(
        page.flatMap(({ tiles }) => tiles),
        resolve(outputDirectory, `accessory-review-batch-${String(batchNumber).padStart(2, "0")}-page-${pageNumber}.webp`),
      );
    }
    const manifest = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      batchNumber,
      batchSize,
      totalPendingPartCount: queue.summary.pendingReviewCount,
      automatedLowRiskPartCount: queue.entries.filter((entry) =>
        entry.reviewStatus === "pending-human-visual-review" && entry.riskFlags.length === 0).length,
      manualRiskPartCount: queue.entries.filter((entry) =>
        entry.reviewStatus === "pending-human-visual-review" && entry.riskFlags.length > 0).length,
      manualRiskRepresentativeCount: groups.length,
      entries: captured.map(({ group }) => ({
        representativePartNum: group.representative.rebrickablePartNum,
        priorityTier: group.representative.priorityTier,
        riskFlags: group.representative.riskFlags,
        familyPartNums: group.members.map(({ rebrickablePartNum }) => rebrickablePartNum),
      })),
    };
    await writeFile(
      resolve(outputDirectory, `accessory-review-batch-${String(batchNumber).padStart(2, "0")}.json`),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    process.stdout.write(`${JSON.stringify({
      message: "accessory review contact sheets built",
      batchNumber,
      reviewedRepresentatives: captured.length,
      outputDirectory,
    })}\n`);
  } finally {
    client?.close();
    await previewServer.server.close();
    if (chrome) {
      await stopChrome(chrome.process);
      await rm(chrome.profileDirectory, { force: true, recursive: true, maxRetries: 5, retryDelay: 100 });
    }
  }
};

await run();
