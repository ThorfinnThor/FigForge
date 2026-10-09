import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createServer, preview, type Plugin, type PreviewServer, type ViteDevServer } from "vite";

const ROOT_URL = "about:blank";
const DEFAULT_TIMEOUT_MS = 30_000;

type CdpMessage = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { message?: string };
};

type PendingCommand = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
};

class CdpClient {
  readonly #socket: WebSocket;
  readonly #pending = new Map<number, PendingCommand>();
  readonly #listeners = new Map<string, Set<(params: Record<string, unknown>) => void>>();
  #nextId = 1;

  private constructor(socket: WebSocket) {
    this.#socket = socket;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage;
      if (message.id !== undefined) {
        const pending = this.#pending.get(message.id);
        if (!pending) return;
        this.#pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message ?? "CDP command failed"));
        else pending.resolve(message.result);
        return;
      }
      if (!message.method) return;
      for (const listener of this.#listeners.get(message.method) ?? []) {
        listener(message.params ?? {});
      }
    });
    socket.addEventListener("close", () => {
      for (const { reject } of this.#pending.values()) reject(new Error("Chrome DevTools connection closed"));
      this.#pending.clear();
    });
  }

  static async connect(url: string): Promise<CdpClient> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error("Could not connect to Chrome DevTools")), { once: true });
    });
    return new CdpClient(socket);
  }

  async send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.#nextId;
    this.#nextId += 1;
    const result = new Promise<unknown>((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
    });
    this.#socket.send(JSON.stringify({ id, method, params }));
    return await result as T;
  }

  on(method: string, listener: (params: Record<string, unknown>) => void): () => void {
    const listeners = this.#listeners.get(method) ?? new Set();
    listeners.add(listener);
    this.#listeners.set(method, listeners);
    return () => listeners.delete(listener);
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

const isNavigationRace = (error: unknown): boolean => error instanceof Error && [
  "Inspected target navigated or closed",
  "Cannot find context with specified id",
  "Execution context was destroyed",
].some((message) => error.message.includes(message));

const waitFor = async (
  client: CdpClient,
  expression: string,
  label: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await evaluate<boolean>(client, expression)) return;
    } catch (error) {
      if (!isNavigationRace(error)) throw error;
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const textIncludes = (text: string): string => `document.body.innerText.includes(${JSON.stringify(text)})`;

const findChrome = async (): Promise<string> => {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.GOOGLE_CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next standard installation path.
    }
  }
  throw new Error("Chrome/Chromium not found. Set CHROME_BIN to run browser regressions.");
};

const freePort = async (): Promise<number> => await new Promise((resolve, reject) => {
  const server = createNetServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      reject(new Error("Could not reserve a browser debugging port"));
      return;
    }
    server.close((error) => error ? reject(error) : resolve(address.port));
  });
});

const waitForJson = async <T>(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json() as T;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${url}: ${String(lastError)}`);
};

const startVitePreview = async (): Promise<{ server: PreviewServer; origin: string }> => {
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

const startStorageHarness = async (): Promise<{ server: ViteDevServer; origin: string }> => {
  const harnessPlugin: Plugin = {
    name: "figforge-storage-browser-harness",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url !== "/__browser-storage-qa") {
          next();
          return;
        }
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end("<!doctype html><html><body>FigForge storage browser QA</body></html>");
      });
    },
  };
  const server = await createServer({
    logLevel: "error",
    plugins: [harnessPlugin],
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  await server.listen();
  await Promise.all([
    server.warmupRequest("/src/storage/figure-draft-store.ts"),
    server.warmupRequest("/src/figure/figure-document.ts"),
  ]);
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") {
    await server.close();
    throw new Error("Vite storage harness did not expose a local TCP address");
  }
  return { server, origin: `http://127.0.0.1:${address.port}` };
};

const launchChrome = async (): Promise<{
  process: ChildProcess;
  profileDirectory: string;
  debuggingOrigin: string;
}> => {
  const executable = await findChrome();
  const port = await freePort();
  const profileDirectory = await mkdtemp(join(tmpdir(), "figforge-browser-qa-"));
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
    "--window-size=1280,900",
    ROOT_URL,
  ];
  if (process.platform === "linux") args.unshift("--no-sandbox");
  const chrome = spawn(executable, args, { stdio: ["ignore", "ignore", "pipe"] });
  const stderr: string[] = [];
  chrome.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk.toString()));
  const earlyExit = new Promise<never>((_resolve, reject) => {
    chrome.once("exit", (code, signal) => reject(new Error(
      `Chrome exited before DevTools was ready (code ${String(code)}, signal ${String(signal)})`,
    )));
  });
  chrome.once("exit", (code) => {
    if (code && stderr.length > 0) process.stderr.write(stderr.join(""));
  });
  const debuggingOrigin = `http://127.0.0.1:${port}`;
  try {
    await Promise.race([
      waitForJson(`${debuggingOrigin}/json/version`),
      earlyExit,
    ]);
  } catch (error) {
    chrome.kill("SIGKILL");
    await rm(profileDirectory, { force: true, recursive: true });
    const diagnostic = stderr.join("").trim();
    throw new Error(
      `${String(error)}${diagnostic ? `\nChrome output:\n${diagnostic}` : `\nChrome exited with code ${String(chrome.exitCode)}`}`,
      { cause: error },
    );
  }
  return { process: chrome, profileDirectory, debuggingOrigin };
};

const createPage = async (debuggingOrigin: string): Promise<CdpClient> => {
  const response = await fetch(`${debuggingOrigin}/json/new?${encodeURIComponent(ROOT_URL)}`, { method: "PUT" });
  if (!response.ok) throw new Error(`Could not create Chrome target (${response.status})`);
  const target = await response.json() as { webSocketDebuggerUrl?: string };
  if (!target.webSocketDebuggerUrl) throw new Error("Chrome target has no debugger WebSocket");
  const client = await CdpClient.connect(target.webSocketDebuggerUrl);
  await Promise.all([
    client.send("Page.enable"),
    client.send("Runtime.enable"),
  ]);
  return client;
};

const navigate = async (client: CdpClient, url: string): Promise<void> => {
  let removeLoadListener = () => {};
  const loaded = new Promise<void>((resolve) => {
    removeLoadListener = client.on("Page.loadEventFired", () => {
      removeLoadListener();
      resolve();
    });
  });
  await client.send("Page.navigate", { url });
  await Promise.race([
    loaded,
    delay(DEFAULT_TIMEOUT_MS).then(() => { throw new Error(`Timed out navigating to ${url}`); }),
  ]);
  await waitFor(client, "document.readyState === 'complete'", `page ${url}`);
};

const testIndexedDbCommitAndAbort = async (client: CdpClient, origin: string): Promise<void> => {
  await navigate(client, origin);
  const result = await evaluate<{
    loadedName: string | null;
    abortRejected: boolean;
    valueAfterAbort: string | null;
    cleared: boolean;
  }>(client, `(async () => {
    const storage = await import('/src/storage/figure-draft-store.ts');
    const figures = await import('/src/figure/figure-document.ts');
    await storage.clearLocalFigureData();
    const document = figures.createFigureDocument(
      { head: 'ff03-head-3626c' },
      'Browser IndexedDB regression',
      '2026-10-09T10:00:00.000Z',
    );
    await storage.saveCurrentFigureDraft(document);
    const loaded = await storage.loadCurrentFigureDraft();

    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('figforge-browser-abort', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('values');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const transaction = database.transaction('values', 'readwrite');
      transaction.objectStore('values').put('before', 'key');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
    const transaction = database.transaction('values', 'readwrite');
    const request = transaction.objectStore('values').put('after', 'key');
    request.addEventListener('success', () => transaction.abort(), { once: true });
    let abortRejected = false;
    try {
      await storage.committedMutation(transaction, [request]);
    } catch {
      abortRejected = true;
    }
    const valueAfterAbort = await new Promise((resolve, reject) => {
      const read = database.transaction('values').objectStore('values').get('key');
      read.onsuccess = () => resolve(read.result ?? null);
      read.onerror = () => reject(read.error);
    });
    database.close();
    await storage.clearLocalFigureData();
    const cleared = await storage.loadCurrentFigureDraft() === null;
    return { loadedName: loaded?.name ?? null, abortRejected, valueAfterAbort, cleared };
  })()`);
  assert.equal(result.loadedName, "Browser IndexedDB regression");
  assert.equal(result.abortRejected, true, "aborted transaction must reject after request success");
  assert.equal(result.valueAfterAbort, "before", "aborted write must be rolled back");
  assert.equal(result.cleared, true);
};

const activeMobileTab = async (client: CdpClient): Promise<string | null> => await evaluate(client,
  "document.activeElement?.getAttribute('id') ?? null");

const dispatchKey = async (client: CdpClient, key: string): Promise<void> => {
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", key });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key });
};

const assertSelectedPanel = async (client: CdpClient, tab: string): Promise<void> => {
  const state = await evaluate<{ selected: boolean; panel: boolean }>(client, `(() => {
    const tab = document.querySelector('#mobile-tab-${tab}');
    const panel = document.querySelector('#mobile-panel-${tab}');
    return { selected: tab?.getAttribute('aria-selected') === 'true', panel: panel?.getAttribute('role') === 'tabpanel' };
  })()`);
  assert.deepEqual(state, { selected: true, panel: true });
};

const testMountedMobileKeyboard = async (client: CdpClient, origin: string): Promise<void> => {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await navigate(client, origin);
  await waitFor(client, "document.querySelectorAll('[role=tab]').length === 3", "mounted mobile tabs");
  await evaluate(client, "document.querySelector('#mobile-tab-parts').focus()");
  assert.equal(await activeMobileTab(client), "mobile-tab-parts");
  await assertSelectedPanel(client, "parts");

  await dispatchKey(client, "ArrowRight");
  await waitFor(client, "document.activeElement?.id === 'mobile-tab-figure'", "ArrowRight tab focus");
  await assertSelectedPanel(client, "figure");

  await dispatchKey(client, "End");
  await waitFor(client, "document.activeElement?.id === 'mobile-tab-list'", "End tab focus");
  await assertSelectedPanel(client, "list");

  await dispatchKey(client, "Home");
  await waitFor(client, "document.activeElement?.id === 'mobile-tab-parts'", "Home tab focus");
  await assertSelectedPanel(client, "parts");

  await dispatchKey(client, "ArrowLeft");
  await waitFor(client, "document.activeElement?.id === 'mobile-tab-list'", "ArrowLeft wrap-around tab focus");
  await assertSelectedPanel(client, "list");
  await client.send("Emulation.clearDeviceMetricsOverride");
};

const clickButtonWithText = async (client: CdpClient, text: string): Promise<boolean> => await evaluate(client, `(() => {
  const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === ${JSON.stringify(text)});
  if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
  button.click();
  return true;
})()`);

const testLDrawAndWebGlFailures = async (client: CdpClient, origin: string): Promise<void> => {
  await navigate(client, origin);
  await waitFor(client, `Boolean(document.querySelector('.scene-lab[data-scene-state="ready"][data-selection-state="synchronized"] canvas.viewport'))`, "initial 3D preview", 60_000);

  await evaluate(client, `(() => {
    const originalFetch = window.fetch.bind(window);
    window.__figforgeLdrawFailureInjected = false;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!window.__figforgeLdrawFailureInjected && url.includes('/assets/ldraw/') && url.endsWith('.dat')) {
        window.__figforgeLdrawFailureInjected = true;
        window.fetch = originalFetch;
        throw new TypeError('Injected one-shot LDraw request failure');
      }
      return originalFetch(input, init);
    };
  })()`);
  const clicked = await evaluate<boolean>(client, `(() => {
    const button = [...document.querySelectorAll('.part-card[data-role="head"] button')]
      .find((candidate) => candidate instanceof HTMLButtonElement && !candidate.disabled && candidate.getAttribute('aria-pressed') !== 'true');
    if (!(button instanceof HTMLButtonElement)) return false;
    button.click();
    return true;
  })()`);
  assert.equal(clicked, true, "a second loadable head must be available for fault injection");
  await waitFor(client, textIncludes("Die 3D-Vorschau konnte die aktuelle Auswahl nicht übernehmen"), "LDraw selection error");
  assert.equal(await evaluate<boolean>(client, "window.__figforgeLdrawFailureInjected === true"), true,
    "the injected .dat failure must have been consumed");

  assert.equal(await clickButtonWithText(client, "Vorne"), true);
  assert.equal(await evaluate<boolean>(client, textIncludes("Die 3D-Vorschau konnte die aktuelle Auswahl nicht übernehmen")), true,
    "camera changes must not hide a selection error");

  const drawerOpened = await evaluate<boolean>(client, `(() => {
    const button = document.querySelector('.workspace-drawer-trigger');
    if (!(button instanceof HTMLButtonElement)) return false;
    button.click();
    return true;
  })()`);
  assert.equal(drawerOpened, true);
  await waitFor(client, textIncludes("Die Teileliste entspricht der aktuellen Auswahl"), "stale preview warning");
  await evaluate(client, `document.querySelector('.figure-panel-backdrop')?.click()`);

  assert.equal(await clickButtonWithText(client, "Aktuelle Auswahl erneut laden"), true);
  try {
    await waitFor(client, `!${textIncludes("Die 3D-Vorschau konnte die aktuelle Auswahl nicht übernehmen")} && Boolean(document.querySelector('.scene-lab[data-scene-state="ready"][data-selection-state="synchronized"]'))`, "successful LDraw retry", 20_000);
  } catch (error) {
    const diagnosis = await evaluate(client, `(() => ({
      sceneCopy: document.querySelector('.scene-copy')?.innerText ?? null,
      buttons: [...document.querySelectorAll('.scene-copy button')].map((button) => button.textContent?.trim()),
      canvasCount: document.querySelectorAll('canvas.viewport').length,
      contextLost: document.querySelector('canvas.viewport') instanceof HTMLCanvasElement
        ? document.querySelector('canvas.viewport').getContext('webgl2')?.isContextLost() ?? null
        : null,
    }))()`);
    throw new Error(`LDraw retry did not recover: ${JSON.stringify(diagnosis)}`, { cause: error });
  }

  const contextLossAvailable = await evaluate<boolean>(client, `(() => {
    const canvas = document.querySelector('canvas.viewport');
    if (!(canvas instanceof HTMLCanvasElement)) return false;
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext();
    return true;
  })()`);
  assert.equal(contextLossAvailable, true, "headless Chrome must expose WEBGL_lose_context");
  await waitFor(client, textIncludes("Die 3D-Darstellung wurde unterbrochen"), "WebGL context-loss UI");
  assert.equal(await clickButtonWithText(client, "3D-Vorschau wiederherstellen"), true);
  await waitFor(client, `!${textIncludes("Die 3D-Darstellung wurde unterbrochen")} && Boolean(document.querySelector('.scene-lab[data-scene-state="ready"][data-selection-state="synchronized"]'))`, "WebGL scene rebuild", 60_000);
};

const run = async (): Promise<void> => {
  const storageHarness = await startStorageHarness();
  const previewServer = await startVitePreview();
  let chrome: Awaited<ReturnType<typeof launchChrome>>;
  try {
    chrome = await launchChrome();
  } catch (error) {
    await Promise.all([storageHarness.server.close(), previewServer.server.close()]);
    if (process.env.CI) throw error;
    process.stdout.write(`↷ browser regressions skipped: ${error instanceof Error ? error.message : String(error)}\n`);
    return;
  }
  const client = await createPage(chrome.debuggingOrigin);
  try {
    await testIndexedDbCommitAndAbort(client, `${storageHarness.origin}/__browser-storage-qa`);
    process.stdout.write("✓ real IndexedDB commit and abort-after-request-success\n");
    await testMountedMobileKeyboard(client, previewServer.origin);
    process.stdout.write("✓ mounted mobile ArrowLeft/ArrowRight/Home/End navigation\n");
    await testLDrawAndWebGlFailures(client, previewServer.origin);
    process.stdout.write("✓ browser LDraw request failure and WebGL context-loss recovery\n");
  } finally {
    client.close();
    chrome.process.kill("SIGTERM");
    await Promise.all([storageHarness.server.close(), previewServer.server.close()]);
    await rm(chrome.profileDirectory, { force: true, recursive: true });
  }
};

await run();
