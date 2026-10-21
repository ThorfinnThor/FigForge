import { disableAnalytics, loadAnalytics, type AnalyticsEnvironment } from "./analytics.js";
import { createConsentStore, type ConsentStore } from "./consent-store.js";

/** Connects the stored decision to Google Analytics: nothing loads before "granted". */
export const connectConsent = (
  id: string,
  store: ConsentStore,
  environment: AnalyticsEnvironment,
): (() => void) => {
  let applied: "granted" | "denied" | null = null;
  const apply = (): void => {
    const { choice } = store.getSnapshot();
    if (choice === applied) return;
    applied = choice;
    if (choice === "granted") loadAnalytics(id, environment);
    else if (choice === "denied") disableAnalytics(id, environment);
  };
  apply();
  return store.subscribe(apply);
};

const browserStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const browserConsentStore = (): ConsentStore => createConsentStore(browserStorage());

export const browserAnalyticsEnvironment = (): AnalyticsEnvironment => ({
  win: window as unknown as AnalyticsEnvironment["win"],
  doc: document,
  hostname: window.location.hostname,
});
