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

/** `pageUrl` is the blank storage QA page: the real app would re-save its draft while the test clears it. */
const testIndexedDbCommitAndAbort = async (client: CdpClient, pageUrl: string): Promise<void> => {
  await navigate(client, pageUrl);
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
  await navigate(client, `${origin}/builder`);
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

const testMountedMobilePurchaseFlow = async (client: CdpClient, origin: string): Promise<void> => {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await navigate(client, `${origin}/builder`);
  await waitFor(client, "Boolean(document.querySelector('#mobile-tab-figure'))", "mobile figure tab");
  const figureTabOpened = await evaluate<boolean>(client, `(() => {
    const button = document.querySelector('#mobile-tab-figure');
    if (!(button instanceof HTMLButtonElement)) return false;
    button.click();
    return true;
  })()`);
  assert.equal(figureTabOpened, true, "the mounted figure tab must be available");
  await waitFor(
    client,
    "document.querySelector('#mobile-tab-figure')?.getAttribute('aria-selected') === 'true'",
    "mobile figure panel",
  );
  await waitFor(
    client,
    `Boolean([...document.querySelectorAll('.scene-copy__actions button')].find((candidate) =>
      ['Teile kaufen', 'Buy parts'].includes(candidate.textContent?.trim() ?? '') &&
      candidate instanceof HTMLButtonElement &&
      !candidate.disabled
    ))`,
    "synchronized mobile purchase action",
    60_000,
  );
  const opened = await evaluate<boolean>(client, `(() => {
    const button = [...document.querySelectorAll('.scene-copy__actions button')].find((candidate) =>
      ['Teile kaufen', 'Buy parts'].includes(candidate.textContent?.trim() ?? '')
    );
    if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
    button.click();
    return true;
  })()`);
  assert.equal(opened, true, "the purchase action must be enabled for the mounted figure");
  await waitFor(
    client,
    "document.querySelector('#mobile-tab-list')?.getAttribute('aria-selected') === 'true'",
    "mobile purchase list tab",
  );
  await assertSelectedPanel(client, "list");
  await waitFor(
    client,
    `(() => {
      const bounds = document.querySelector('.purchase-colors')?.getBoundingClientRect();
      return Boolean(bounds && bounds.top < window.innerHeight && bounds.bottom > 0);
    })()`,
    "mobile purchase controls in viewport",
  );
  const purchaseState = await evaluate<{ colors: boolean; exports: boolean; inViewport: boolean }>(client, `(() => {
    const colors = document.querySelector('.purchase-colors');
    const exports = document.querySelector('.shop-export');
    const bounds = colors?.getBoundingClientRect();
    return {
      colors: Boolean(colors),
      exports: Boolean(exports),
      inViewport: Boolean(bounds && bounds.top < window.innerHeight && bounds.bottom > 0),
    };
  })()`);
  assert.deepEqual(purchaseState, { colors: true, exports: true, inViewport: true });

  // Clipboard access can be refused in headless Chrome; either outcome must be reported to the user.
  await waitFor(client, "Boolean(document.querySelector('.shop-export__copy'))", "BrickLink copy button");
  await evaluate(client, "document.querySelector('.shop-export__copy').click()");
  await waitFor(client, "Boolean(document.querySelector('.shop-export__message'))", "copy result message");
  await client.send("Emulation.clearDeviceMetricsOverride");
};

const testTemplateAndSixFigureStage = async (client: CdpClient, origin: string): Promise<{
  stageLoadMs: number;
  templateLoadMs: number;
}> => {
  const templateStartedAt = Date.now();
  await navigate(client, `${origin}/?template=pirate-captain`);
  await waitFor(
    client,
    "Boolean(document.querySelector('.scene-lab[data-scene-state=\"ready\"][data-selection-state=\"synchronized\"]'))",
    "complete pirate template preview",
    60_000,
  );
  const templateLoadMs = Date.now() - templateStartedAt;
  const templateState = await evaluate<{ count: string; consumed: boolean }>(client, `({
    count: document.querySelector('.workspace-drawer-trigger')?.textContent?.trim() ?? '',
    consumed: !new URLSearchParams(location.search).has('template'),
  })`);
  assert.match(templateState.count, /5\/5/u);
  assert.equal(templateState.consumed, true, "the successful template import must consume its query parameter");

  const seeded = await evaluate<boolean>(client, `(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('figforge', 5);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const document = await new Promise((resolve, reject) => {
      const request = database.transaction('figure-drafts').objectStore('figure-drafts').get('current');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!document || document.selections?.length !== 5) {
      database.close();
      return false;
    }
    const now = new Date().toISOString();
    const ids = Array.from({ length: 6 }, (_, index) => 'browser-stage-' + String(index + 1));
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(['figure-collection', 'playground-layout'], 'readwrite');
      const collection = transaction.objectStore('figure-collection');
      collection.clear();
      ids.forEach((id, index) => collection.put({
        id,
        document: { ...document, name: 'Browser Stage ' + String(index + 1), updatedAt: now },
        createdAt: now,
        updatedAt: now,
      }));
      transaction.objectStore('playground-layout').put({
        schemaVersion: 2,
        kind: 'figforge-playground-stages',
        updatedAt: now,
        activeStageId: 'stage-main',
        stages: [{ id: 'stage-main', name: 'Browser Stage', savedFigureIds: ids }],
      }, 'current');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
    return true;
  })()`);
  assert.equal(seeded, true, "the browser fixture must seed six complete figures");

  const stageStartedAt = Date.now();
  await navigate(client, `${origin}/collection`);
  await waitFor(
    client,
    "document.querySelector('.collection-viewport')?.getAttribute('data-scene-state') === 'ready'",
    "six-figure collection stage",
    60_000,
  );
  const stageLoadMs = Date.now() - stageStartedAt;
  return { stageLoadMs, templateLoadMs };
};

const clickButtonWithText = async (client: CdpClient, text: string): Promise<boolean> => await evaluate(client, `(() => {
  const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === ${JSON.stringify(text)});
  if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
  button.click();
  return true;
})()`);

const testNamedCollectionSave = async (client: CdpClient, origin: string): Promise<void> => {
  const figureName = "Browser Named Hero";
  await navigate(client, `${origin}/builder`);
  await waitFor(
    client,
    `Boolean([...document.querySelectorAll('button')].find((button) =>
      button.textContent?.trim() === 'In Sammlung speichern' &&
      button instanceof HTMLButtonElement &&
      !button.disabled
    ))`,
    "synchronized collection save action",
    60_000,
  );
  assert.equal(await clickButtonWithText(client, "In Sammlung speichern"), true);
  await waitFor(client, `Boolean(document.querySelector('.collection-save-dialog input'))`, "collection naming dialog");
  const nameEntered = await evaluate<boolean>(client, `(() => {
    const input = document.querySelector('.collection-save-dialog input');
    if (!(input instanceof HTMLInputElement)) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, ${JSON.stringify(figureName)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return input.value === ${JSON.stringify(figureName)};
  })()`);
  assert.equal(nameEntered, true, "the collection name must be editable");
  assert.equal(await clickButtonWithText(client, "Figur speichern"), true);
  await waitFor(client, `${textIncludes("Zur Sammlung hinzugefügt")} && ${textIncludes(figureName)}`, "named collection save confirmation");
  assert.equal(await clickButtonWithText(client, "Fertig"), true);
  await waitFor(client, "!document.querySelector('.collection-save-dialog')", "collection confirmation close");
  await navigate(client, `${origin}/collection`);
  await waitFor(client, textIncludes(figureName), "named figure in collection");
};

const testLDrawAndWebGlFailures = async (client: CdpClient, origin: string): Promise<void> => {
  await navigate(client, `${origin}/builder`);
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

const testLandingPage = async (client: CdpClient, origin: string): Promise<void> => {
  await navigate(client, origin);
  await waitFor(client, "Boolean(document.querySelector('.landing-page h1'))", "landing page heading");
  const landing = await evaluate<{ startHref: string | null; worldLinks: number; builderPresent: boolean }>(client, `(() => ({
    startHref: document.querySelector('.landing-page__actions a')?.getAttribute('href') ?? null,
    worldLinks: document.querySelectorAll('.ideas-worlds a[href^="/ideas/"]').length,
    builderPresent: Boolean(document.querySelector('#catalog-heading')),
  }))()`);
  assert.deepEqual(landing, { startHref: "/builder", worldLinks: 4, builderPresent: false });

  await navigate(client, `${origin}/builder`);
  await waitFor(client, "Boolean(document.querySelector('#catalog-heading'))", "builder at /builder");
};

const testEnglishUrls = async (client: CdpClient, origin: string): Promise<void> => {
  await navigate(client, `${origin}/en/`);
  await waitFor(client, "Boolean(document.querySelector('.landing-page h1'))", "English landing page");
  const english = await evaluate<{ heading: string; lang: string; builderHref: string | null; picker: string }>(client, `(() => ({
    heading: document.querySelector('.landing-page h1')?.textContent ?? '',
    lang: document.documentElement.lang,
    builderHref: document.querySelector('.landing-page__actions a')?.getAttribute('href') ?? null,
    picker: document.querySelector('.language-picker select')?.value ?? '',
  }))()`);
  assert.deepEqual(english, {
    heading: "Assemble your minifigure from real parts.",
    lang: "en",
    builderHref: "/en/builder",
    picker: "en",
  });

  // The picker switches in place and rewrites the URL to the German page.
  await evaluate(client, `(() => {
    const select = document.querySelector('.language-picker select');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'de');
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor(client, "location.pathname === '/' && document.querySelector('.landing-page h1')?.textContent?.startsWith('Stelle deine')", "German page after the picker");
  assert.equal(await evaluate(client, "document.documentElement.lang"), "de");

  await navigate(client, `${origin}/en/builder`);
  await waitFor(client, "Boolean(document.querySelector('#catalog-heading'))", "English builder");
  assert.equal(await evaluate(client, "document.querySelector('#catalog-heading')?.textContent"), "Build the character you imagine.");
};

const testGuides = async (client: CdpClient, origin: string): Promise<void> => {
  await navigate(client, `${origin}/ratgeber/minifiguren-teile-bestellen`);
  await waitFor(client, "Boolean(document.querySelector('.guide-page h1'))", "German guide");
  const german = await evaluate<{ heading: string; sections: number; related: number }>(client, `(() => ({
    heading: document.querySelector('.guide-page h1')?.textContent ?? '',
    sections: document.querySelectorAll('.guide-page__body section').length,
    related: document.querySelectorAll('.guide-page__more li a').length,
  }))()`);
  assert.equal(german.heading, "Minifiguren-Teile bestellen: BrickLink, Pick a Brick und Rebrickable");
  assert.ok(german.sections >= 5, "guide shows its sections");
  assert.equal(german.related, 3);

  await navigate(client, `${origin}/en/guides/minifigure-gift`);
  await waitFor(client, "Boolean(document.querySelector('.guide-page h1'))", "English guide");
  assert.match(await evaluate<string>(client, "document.querySelector('.guide-page h1').textContent"), /^Give a minifigure as a gift/u);
  await evaluate(client, `(() => {
    const select = document.querySelector('.language-picker select');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'de');
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor(client, "location.pathname === '/ratgeber/minifigur-verschenken' && document.querySelector('.guide-page h1')?.textContent?.startsWith('Eine Minifigur verschenken')", "German guide after the picker");

  await navigate(client, `${origin}/en/guides`);
  await waitFor(client, "document.querySelectorAll('.guides-list li').length === 8", "English guides hub");
};

const testImprint = async (client: CdpClient, origin: string): Promise<void> => {
  for (const [path, heading] of [["/impressum", "Impressum"], ["/en/imprint", "Imprint"]] as const) {
    await navigate(client, `${origin}${path}`);
    await waitFor(client, "Boolean(document.querySelector('#imprint-title'))", `imprint at ${path}`);
    const page = await evaluate<{ heading: string; text: string; mail: string | null }>(client, `(() => ({
      heading: document.querySelector('#imprint-title').textContent,
      text: document.querySelector('.workspace-methodology').innerText,
      mail: document.querySelector('a[href^="mailto:"]')?.getAttribute('href') ?? null,
    }))()`);
    assert.equal(page.heading, heading);
    assert.match(page.text, /SeitenHafen361/u);
    assert.match(page.text, /Freienwalder Str\. 34/u);
    assert.equal(page.mail, "mailto:contact@createyourminifig.com");
  }
};

const testRecoversFromPoisonedChunk = async (client: CdpClient, origin: string): Promise<void> => {
  // Reproduces the state right after a deployment: the first request for the builder chunk is
  // answered with the start page instead of JavaScript. The page must refetch and reload itself.
  let poisonedResponses = 0;
  await client.send("Fetch.enable", { patterns: [{ urlPattern: "*/assets/CatalogWorkspace-*.js", requestStage: "Request" }] });
  const stop = client.on("Fetch.requestPaused", (params) => {
    const requestId = String(params.requestId);
    if (poisonedResponses === 0) {
      poisonedResponses += 1;
      void client.send("Fetch.fulfillRequest", {
        requestId,
        responseCode: 200,
        responseHeaders: [{ name: "Content-Type", value: "text/html; charset=utf-8" }],
        body: Buffer.from("<!doctype html><html><head><title>FigForge</title></head><body></body></html>").toString("base64"),
      });
    } else {
      void client.send("Fetch.continueRequest", { requestId });
    }
  });
  try {
    await navigate(client, `${origin}/builder`);
    await waitFor(client, "Boolean(document.querySelector('#catalog-heading'))", "builder after the poisoned chunk", 30_000);
    assert.equal(poisonedResponses, 1, "the poisoned chunk response was served once");
    const marker = await evaluate<unknown>(client, "history.state?.figforgeChunkReloadAt ?? null");
    assert.equal(typeof marker, "number", "the page reloaded itself once and remembered it");
  } finally {
    stop();
    await client.send("Fetch.disable");
  }
};

const CONSENT_KEY = "figforge-consent-v1";
const TEST_MEASUREMENT_ID = "G-TEST123456";

const testAnalyticsConsent = async (client: CdpClient, origin: string): Promise<void> => {
  // The build for these tests carries a test measurement ID. Requests to Google are answered with an
  // empty script and counted, so the test sees exactly when the page would have contacted Google.
  const googleRequests: string[] = [];
  const requests = (): readonly string[] => googleRequests;
  await client.send("Fetch.enable", { patterns: [{ urlPattern: "*googletagmanager.com*", requestStage: "Request" }] });
  const stop = client.on("Fetch.requestPaused", (params) => {
    googleRequests.push((params.request as { url: string }).url);
    void client.send("Fetch.fulfillRequest", {
      requestId: String(params.requestId),
      responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "text/javascript" }],
      body: Buffer.from("/* stub */").toString("base64"),
    });
  });
  const stored = (): Promise<string | null> => evaluate(client, `(() => { try { return JSON.parse(localStorage.getItem('${CONSENT_KEY}') ?? 'null')?.choice ?? null; } catch { return null; } })()`);
  const bannerGone = (label: string) => waitFor(client, "!document.querySelector('.consent-banner')", label);
  const openSettings = async (): Promise<void> => {
    await evaluate(client, "document.querySelector('.app-more summary').click()");
    await waitFor(client, "Boolean(document.querySelector('.app-more__button'))", "cookie settings entry");
    await evaluate(client, "document.querySelector('.app-more__button').click()");
    await waitFor(client, "Boolean(document.querySelector('.consent-banner'))", "banner opened from the menu");
  };
  try {
    await navigate(client, `${origin}/`);
    await evaluate(client, `localStorage.removeItem('${CONSENT_KEY}')`);
    await navigate(client, `${origin}/`);
    await waitFor(client, "Boolean(document.querySelector('.consent-banner'))", "consent banner on the first visit");
    assert.deepEqual(requests(), [], "nothing is requested from Google before a decision");
    const first = await evaluate<{ buttons: string[]; focusStolen: boolean; cookies: string }>(client, `({
      buttons: [...document.querySelectorAll('.consent-banner__actions button')].map((button) => button.textContent),
      focusStolen: Boolean(document.activeElement?.closest('.consent-banner')),
      cookies: document.cookie,
    })`);
    assert.deepEqual(first.buttons, ["Erlauben", "Ablehnen"]);
    assert.equal(first.focusStolen, false, "the first-visit banner does not take focus");
    assert.equal(first.cookies.includes("_ga"), false);

    assert.equal(await clickButtonWithText(client, "Ablehnen"), true);
    await bannerGone("banner after declining");
    assert.equal(await stored(), "denied");
    assert.deepEqual(requests(), [], "declining loads nothing from Google");

    await navigate(client, `${origin}/`);
    await waitFor(client, "Boolean(document.querySelector('.app-header'))", "page after declining");
    assert.equal(await evaluate(client, "Boolean(document.querySelector('.consent-banner'))"), false, "no second question");
    assert.deepEqual(requests(), []);

    await evaluate(client, "document.cookie = '_ga=GA1.1.test; path=/'");
    await openSettings();
    assert.match(await evaluate<string>(client, "document.querySelector('.consent-banner__current').textContent"), /abgelehnt/u);
    assert.equal(await evaluate(client, "Boolean(document.activeElement?.closest('.consent-banner'))"), true, "an opened banner takes focus");
    assert.equal(await clickButtonWithText(client, "Erlauben"), true);
    await bannerGone("banner after allowing");
    assert.equal(await stored(), "granted");
    await waitFor(client, "true", "script request");
    await waitFor(client, `document.querySelector('script[src*="googletagmanager"]') !== null`, "analytics script element");
    assert.equal(requests().length, 1);
    assert.ok(requests()[0]?.includes(`id=${TEST_MEASUREMENT_ID}`), "the script is requested for the measurement ID");

    await openSettings();
    assert.equal(await clickButtonWithText(client, "Ablehnen"), true);
    await bannerGone("banner after withdrawing");
    const withdrawn = await evaluate<{ disabled: unknown; cookies: string; choice: string | null }>(client, `({
      disabled: window['ga-disable-${TEST_MEASUREMENT_ID}'],
      cookies: document.cookie,
      choice: JSON.parse(localStorage.getItem('${CONSENT_KEY}') ?? 'null')?.choice ?? null,
    })`);
    assert.equal(withdrawn.disabled, true, "measuring stops at once");
    assert.equal(withdrawn.cookies.includes("_ga"), false, "the Google Analytics cookies are removed");
    assert.equal(withdrawn.choice, "denied");
    assert.equal(requests().length, 1, "withdrawing triggers no further Google request");
  } finally {
    stop();
    await client.send("Fetch.disable");
  }
};

const testCoreFirstCatalogLoading = async (client: CdpClient, origin: string): Promise<void> => {
  await navigate(client, `${origin}/builder`);
  await waitFor(
    client,
    "Boolean(document.querySelector('.scene-lab[data-scene-state=\"ready\"][data-selection-state=\"synchronized\"]'))",
    "default figure preview",
    60_000,
  );
  const atReady = await evaluate<{ elapsedMs: number; largestScriptBytes: number; complete: string | null }>(client, `(() => ({
    elapsedMs: performance.now(),
    largestScriptBytes: Math.max(...performance.getEntriesByType('resource')
      .filter((entry) => /[.](js|json)(?:$|[?])/u.test(entry.name))
      .map((entry) => entry.decodedBodySize)),
    complete: document.querySelector('.catalog-search-sticky')?.getAttribute('data-catalog-complete') ?? null,
  }))()`);
  // The full catalog is prefetched 4 s after load; before that only the core slice may be loaded.
  if (atReady.elapsedMs < 3_000) {
    assert.equal(atReady.complete, "false", "catalog must start as the core slice");
    assert.ok(atReady.largestScriptBytes < 1_000_000, `no full role package at first preview (${atReady.largestScriptBytes} bytes)`);
  }
  await waitFor(
    client,
    "document.querySelector('.catalog-search-sticky')?.getAttribute('data-catalog-complete') === 'true'",
    "full catalog after the core slice",
    30_000,
  );
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
    // The test build has the consent banner switched on; every other test starts with a recorded decision.
    await navigate(client, `${previewServer.origin}/`);
    await evaluate(client, `localStorage.setItem('${CONSENT_KEY}', JSON.stringify({ v: 1, choice: 'denied', at: Date.now() }))`);
    await testIndexedDbCommitAndAbort(client, `${storageHarness.origin}/__browser-storage-qa`);
    process.stdout.write("✓ real IndexedDB commit and abort-after-request-success\n");
    await testLandingPage(client, previewServer.origin);
    process.stdout.write("✓ landing page at / and builder at /builder\n");
    await testEnglishUrls(client, previewServer.origin);
    process.stdout.write("✓ English pages under /en and the language picker\n");
    await testGuides(client, previewServer.origin);
    process.stdout.write("✓ guides in both languages and the picker switching slugs\n");
    await testImprint(client, previewServer.origin);
    process.stdout.write("✓ imprint in both languages\n");
    await testRecoversFromPoisonedChunk(client, previewServer.origin);
    process.stdout.write("✓ page recovers from a poisoned chunk by reloading once\n");
    await testAnalyticsConsent(client, previewServer.origin);
    process.stdout.write("✓ analytics only after consent, withdrawal stops it and removes the cookies\n");
    await testCoreFirstCatalogLoading(client, previewServer.origin);
    process.stdout.write("✓ core packages first, full catalog afterwards\n");
    await testMountedMobileKeyboard(client, previewServer.origin);
    process.stdout.write("✓ mounted mobile ArrowLeft/ArrowRight/Home/End navigation\n");
    await testMountedMobilePurchaseFlow(client, previewServer.origin);
    process.stdout.write("✓ mounted mobile purchase flow reveals colors and exports\n");
    const timings = await testTemplateAndSixFigureStage(client, previewServer.origin);
    process.stdout.write(`✓ complete template and six-figure stage (${timings.templateLoadMs} ms / ${timings.stageLoadMs} ms)\n`);
    await testNamedCollectionSave(client, previewServer.origin);
    process.stdout.write("✓ named collection save and success confirmation\n");
    await testLDrawAndWebGlFailures(client, previewServer.origin);
    process.stdout.write("✓ browser LDraw request failure and WebGL context-loss recovery\n");
  } finally {
    client.close();
    chrome.process.kill("SIGTERM");
    await Promise.all([storageHarness.server.close(), previewServer.server.close()]);
    // Chrome may still be flushing its profile right after SIGTERM, so retry on ENOTEMPTY.
    await rm(chrome.profileDirectory, { force: true, recursive: true, maxRetries: 10, retryDelay: 200 });
  }
};

await run();
