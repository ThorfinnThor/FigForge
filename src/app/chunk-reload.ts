/**
 * Right after a deployment the edge can briefly answer a new asset URL with the start page, and the
 * browser keeps that wrong answer. The page then never finishes loading. When an import fails this
 * way, the failing files are fetched again past the cache and the page reloads once.
 */
const CHUNK_FAILURE_PATTERN =
  /dynamically imported module|Importing a module script failed|Failed to load module script|Unable to preload CSS/iu;

/** A second failure within this window is shown to the user instead of reloading again. */
export const RELOAD_WINDOW_MS = 60_000;
const STATE_KEY = "figforgeChunkReloadAt";

export type ChunkReloadEnvironment = {
  now: () => number;
  readState: () => unknown;
  writeState: (state: Record<string, unknown>) => void;
  /** URLs of the scripts and stylesheets the page itself references. */
  pageAssetUrls: () => string[];
  /** Fetches each URL past the HTTP cache so a cached wrong answer is replaced. */
  refetch: (urls: string[]) => Promise<void>;
  reload: () => void;
};

export const isChunkLoadFailure = (message: string): boolean => CHUNK_FAILURE_PATTERN.test(message);

export const assetUrlsInMessage = (message: string): string[] =>
  [...new Set(message.match(/https?:\/\/[^\s"')]+\.(?:js|css)/gu) ?? [])];

const lastReloadAt = (state: unknown): number => {
  if (typeof state !== "object" || state === null) return 0;
  const value = (state as Record<string, unknown>)[STATE_KEY];
  return typeof value === "number" ? value : 0;
};

/** Returns true when a reload was started, false when the failure is not recoverable (again). */
export const recoverFromChunkFailure = async (
  message: string,
  environment: ChunkReloadEnvironment,
): Promise<boolean> => {
  if (!isChunkLoadFailure(message)) return false;
  const now = environment.now();
  const state = environment.readState();
  if (now - lastReloadAt(state) < RELOAD_WINDOW_MS) return false;
  // Marked before reloading: history.state survives a reload, so a failure that repeats stops here.
  environment.writeState({
    ...(typeof state === "object" && state !== null ? state as Record<string, unknown> : {}),
    [STATE_KEY]: now,
  });
  try {
    await environment.refetch([...new Set([...assetUrlsInMessage(message), ...environment.pageAssetUrls()])]);
  } catch {
    // The reload below is still the best remaining option.
  }
  environment.reload();
  return true;
};

const messageOf = (value: unknown): string => {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  return "";
};

export const browserEnvironment = (win: Window): ChunkReloadEnvironment => ({
  now: () => Date.now(),
  readState: () => win.history.state as unknown,
  writeState: (state) => win.history.replaceState(state, "", win.location.href),
  pageAssetUrls: () => [...win.document.querySelectorAll<HTMLElement>("script[src], link[rel=modulepreload], link[rel=stylesheet]")]
    .map((element) => element instanceof HTMLScriptElement ? element.src : (element as HTMLLinkElement).href)
    .filter(Boolean),
  refetch: async (urls) => {
    await Promise.all(urls.map((url) => fetch(url, { cache: "reload" }).catch(() => undefined)));
  },
  reload: () => win.location.reload(),
});

export const installChunkReload = (
  win: Pick<Window, "addEventListener"> = window,
  environment: ChunkReloadEnvironment = browserEnvironment(window),
): void => {
  win.addEventListener("vite:preloadError", (event) => {
    const payload = (event as Event & { payload?: unknown }).payload;
    void recoverFromChunkFailure(messageOf(payload) || "Unable to preload CSS", environment);
  });
  win.addEventListener("error", (event) => {
    void recoverFromChunkFailure(event.message || messageOf(event.error), environment);
  });
  win.addEventListener("unhandledrejection", (event) => {
    void recoverFromChunkFailure(messageOf(event.reason), environment);
  });
};
