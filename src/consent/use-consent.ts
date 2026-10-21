import { useSyncExternalStore } from "react";
import type { ConsentSnapshot, ConsentStore } from "./consent-store.js";
import { browserConsentStore } from "./consent-runtime.js";

const NO_CONSENT: ConsentSnapshot = { choice: null, settingsOpen: false };

/** One store per page, created on first use in the browser. */
let store: ConsentStore | null = null;
export const consentStore = (): ConsentStore | null => {
  if (typeof window === "undefined") return null;
  store = store ?? browserConsentStore();
  return store;
};

export const useConsent = (): { snapshot: ConsentSnapshot; store: ConsentStore | null } => {
  const current = consentStore();
  const snapshot = useSyncExternalStore(
    (listener) => current?.subscribe(listener) ?? (() => undefined),
    () => current?.getSnapshot() ?? NO_CONSENT,
    () => NO_CONSENT,
  );
  return { snapshot, store: current };
};
