export type ConsentChoice = "granted" | "denied";

export const CONSENT_STORAGE_KEY = "figforge-consent-v1";
/** A stored decision older than this is asked for again. */
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type ConsentSnapshot = {
  choice: ConsentChoice | null;
  /** True while the banner is open to change an existing decision. */
  settingsOpen: boolean;
};

const parse = (raw: string | null, now: number): ConsentChoice | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { choice?: unknown; at?: unknown; v?: unknown };
    if (value.v !== 1 || (value.choice !== "granted" && value.choice !== "denied")) return null;
    if (typeof value.at !== "number" || now - value.at > CONSENT_MAX_AGE_MS || value.at > now + 60_000) return null;
    return value.choice;
  } catch {
    return null;
  }
};

/**
 * Keeps the visitor's analytics decision. It is stored locally (technically necessary to remember it)
 * and never sent anywhere. Storage that is missing or blocked simply means: ask again next time.
 */
export const createConsentStore = (storage: StorageLike | null, now: () => number = Date.now) => {
  const listeners = new Set<() => void>();
  let snapshot: ConsentSnapshot = { choice: null, settingsOpen: false };

  const read = (): ConsentChoice | null => {
    try {
      return parse(storage?.getItem(CONSENT_STORAGE_KEY) ?? null, now());
    } catch {
      return null;
    }
  };
  snapshot = { choice: read(), settingsOpen: false };

  const publish = (next: ConsentSnapshot): void => {
    snapshot = next;
    for (const listener of listeners) listener();
  };
  const decide = (choice: ConsentChoice): void => {
    try {
      storage?.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: 1, choice, at: now() }));
    } catch {
      // The decision still applies to this visit.
    }
    publish({ choice, settingsOpen: false });
  };

  return {
    getSnapshot: (): ConsentSnapshot => snapshot,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    grant: (): void => decide("granted"),
    deny: (): void => decide("denied"),
    openSettings: (): void => publish({ ...snapshot, settingsOpen: true }),
    closeSettings: (): void => publish({ ...snapshot, settingsOpen: false }),
  };
};

export type ConsentStore = ReturnType<typeof createConsentStore>;
