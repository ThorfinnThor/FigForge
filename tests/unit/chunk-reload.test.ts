import { describe, expect, it } from "vitest";
import {
  RELOAD_WINDOW_MS,
  assetUrlsInMessage,
  installChunkReload,
  isChunkLoadFailure,
  recoverFromChunkFailure,
  type ChunkReloadEnvironment,
} from "../../src/app/chunk-reload.js";

const CHROME_MESSAGE =
  "Failed to fetch dynamically imported module: https://createyourminifig.com/assets/CatalogWorkspace-334anaKs.js";

const fakeEnvironment = (initial: { now?: number; state?: unknown; refetchFails?: boolean } = {}) => {
  const calls = { reload: 0, refetched: [] as string[][], states: [] as Array<Record<string, unknown>> };
  let now = initial.now ?? 1_000_000;
  let state = initial.state ?? null;
  const environment: ChunkReloadEnvironment = {
    now: () => now,
    readState: () => state,
    writeState: (next) => { state = next; calls.states.push(next); },
    pageAssetUrls: () => ["https://createyourminifig.com/assets/index-abc.js", "https://createyourminifig.com/assets/index-abc.css"],
    refetch: (urls) => {
      calls.refetched.push(urls);
      return initial.refetchFails ? Promise.reject(new Error("offline")) : Promise.resolve();
    },
    reload: () => { calls.reload += 1; },
  };
  return { environment, calls, advance: (ms: number) => { now += ms; } };
};

describe("recovering from a failed module import", () => {
  it("recognises the browsers' wording for failed imports and nothing else", () => {
    expect(isChunkLoadFailure(CHROME_MESSAGE)).toBe(true);
    expect(isChunkLoadFailure("error loading dynamically imported module: https://x/assets/a.js")).toBe(true);
    expect(isChunkLoadFailure("Importing a module script failed.")).toBe(true);
    expect(isChunkLoadFailure("Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of \"text/html\".")).toBe(true);
    expect(isChunkLoadFailure("Cannot read properties of undefined (reading 'click')")).toBe(false);
    expect(isChunkLoadFailure("")).toBe(false);
  });

  it("takes asset URLs from the message when the browser names them", () => {
    expect(assetUrlsInMessage(CHROME_MESSAGE)).toEqual(["https://createyourminifig.com/assets/CatalogWorkspace-334anaKs.js"]);
    expect(assetUrlsInMessage("Importing a module script failed.")).toEqual([]);
  });

  it("refetches the failing and the page's own assets past the cache, then reloads once", async () => {
    const { environment, calls } = fakeEnvironment();

    expect(await recoverFromChunkFailure(CHROME_MESSAGE, environment)).toBe(true);

    expect(calls.reload).toBe(1);
    expect(calls.refetched).toEqual([[
      "https://createyourminifig.com/assets/CatalogWorkspace-334anaKs.js",
      "https://createyourminifig.com/assets/index-abc.js",
      "https://createyourminifig.com/assets/index-abc.css",
    ]]);
    expect(calls.states[0]).toHaveProperty("figforgeChunkReloadAt", 1_000_000);
  });

  it("keeps other history state and does not touch unrelated errors", async () => {
    const { environment, calls } = fakeEnvironment({ state: { template: "pirate-captain" } });

    expect(await recoverFromChunkFailure("TypeError: something else", environment)).toBe(false);
    expect(calls.reload).toBe(0);
    expect(calls.states).toEqual([]);

    await recoverFromChunkFailure(CHROME_MESSAGE, environment);
    expect(calls.states[0]).toMatchObject({ template: "pirate-captain", figforgeChunkReloadAt: 1_000_000 });
  });

  it("does not reload in a loop: a failure within a minute of the last reload is left to show", async () => {
    const { environment, calls, advance } = fakeEnvironment();

    expect(await recoverFromChunkFailure(CHROME_MESSAGE, environment)).toBe(true);
    advance(RELOAD_WINDOW_MS - 1);
    expect(await recoverFromChunkFailure(CHROME_MESSAGE, environment)).toBe(false);
    expect(calls.reload).toBe(1);

    advance(2);
    expect(await recoverFromChunkFailure(CHROME_MESSAGE, environment)).toBe(true);
    expect(calls.reload).toBe(2);
  });

  it("still reloads when the refetch itself fails", async () => {
    const { environment, calls } = fakeEnvironment({ refetchFails: true });

    expect(await recoverFromChunkFailure(CHROME_MESSAGE, environment)).toBe(true);
    expect(calls.reload).toBe(1);
  });

  it("listens to preload errors, uncaught errors and unhandled rejections", async () => {
    const win = new EventTarget();
    const { environment, calls, advance } = fakeEnvironment();
    installChunkReload(win, environment);
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

    win.dispatchEvent(Object.assign(new Event("vite:preloadError"), { payload: new TypeError(CHROME_MESSAGE) }));
    await settle();
    expect(calls.reload).toBe(1);

    advance(RELOAD_WINDOW_MS + 1);
    win.dispatchEvent(Object.assign(new Event("error"), { message: `Uncaught TypeError: ${CHROME_MESSAGE}` }));
    await settle();
    expect(calls.reload).toBe(2);

    advance(RELOAD_WINDOW_MS + 1);
    win.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason: new TypeError(CHROME_MESSAGE) }));
    await settle();
    expect(calls.reload).toBe(3);

    advance(RELOAD_WINDOW_MS + 1);
    win.dispatchEvent(Object.assign(new Event("error"), { message: "ResizeObserver loop completed" }));
    await settle();
    expect(calls.reload).toBe(3);
  });
});
