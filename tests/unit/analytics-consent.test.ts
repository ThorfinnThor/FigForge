import { describe, expect, it } from "vitest";
import {
  cookieDomains,
  deleteAnalyticsCookies,
  disableAnalytics,
  loadAnalytics,
  type AnalyticsEnvironment,
} from "../../src/consent/analytics.js";
import { connectConsent } from "../../src/consent/consent-runtime.js";
import {
  CONSENT_MAX_AGE_MS,
  CONSENT_STORAGE_KEY,
  createConsentStore,
} from "../../src/consent/consent-store.js";
import { DEFAULT_MEASUREMENT_ID, resolveMeasurementId } from "../../src/consent/measurement-id.js";

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
    data,
  };
};

const fakeEnvironment = (cookie = ""): AnalyticsEnvironment & { scripts: Array<{ src: string; async: boolean }>; cookieWrites: string[] } => {
  const scripts: Array<{ src: string; async: boolean }> = [];
  const cookieWrites: string[] = [];
  const doc = {
    createElement: () => ({ async: false, src: "" }),
    head: { append: (element: unknown) => { scripts.push(element as { src: string; async: boolean }); } },
    get cookie() { return cookie; },
    set cookie(value: string) { cookieWrites.push(value); },
  };
  return { win: {}, doc: doc, hostname: "createyourminifig.com", scripts, cookieWrites };
};

const commands = (win: AnalyticsEnvironment["win"]): unknown[][] =>
  (win.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));

describe("measurement ID", () => {
  it("uses the committed ID without an override, accepts a GA4 ID, trims it and rejects anything else", () => {
    expect(resolveMeasurementId("G-ABC123XYZ9")).toBe("G-ABC123XYZ9");
    expect(resolveMeasurementId("  G-ABC123XYZ9 ")).toBe("G-ABC123XYZ9");
    expect(resolveMeasurementId("")).toBeNull();
    const committed: string = DEFAULT_MEASUREMENT_ID;
    expect(resolveMeasurementId(undefined)).toBe(committed === "" ? null : committed);
    expect(resolveMeasurementId("UA-12345-1")).toBeNull();
    expect(resolveMeasurementId("g-abc123xyz9")).toBeNull();
    expect(resolveMeasurementId("G-<script>")).toBeNull();
  });
});

describe("consent store", () => {
  it("starts undecided and remembers a decision", () => {
    const storage = memoryStorage();
    const store = createConsentStore(storage, () => 1_000);
    expect(store.getSnapshot()).toEqual({ choice: null, settingsOpen: false });

    store.grant();
    expect(store.getSnapshot().choice).toBe("granted");
    expect(JSON.parse(storage.data.get(CONSENT_STORAGE_KEY) ?? "{}")).toEqual({ v: 1, choice: "granted", at: 1_000 });
    expect(createConsentStore(storage, () => 2_000).getSnapshot().choice).toBe("granted");

    store.deny();
    expect(createConsentStore(storage, () => 2_000).getSnapshot().choice).toBe("denied");
  });

  it("asks again after a year and ignores broken or future-dated values", () => {
    const stored = (value: unknown) => memoryStorage({ [CONSENT_STORAGE_KEY]: JSON.stringify(value) });
    expect(createConsentStore(stored({ v: 1, choice: "granted", at: 0 }), () => CONSENT_MAX_AGE_MS).getSnapshot().choice).toBe("granted");
    expect(createConsentStore(stored({ v: 1, choice: "granted", at: 0 }), () => CONSENT_MAX_AGE_MS + 1).getSnapshot().choice).toBeNull();
    expect(createConsentStore(stored({ v: 1, choice: "granted", at: 10 * 60_000 }), () => 0).getSnapshot().choice).toBeNull();
    expect(createConsentStore(stored({ v: 2, choice: "granted", at: 0 }), () => 1).getSnapshot().choice).toBeNull();
    expect(createConsentStore(stored({ v: 1, choice: "yes", at: 0 }), () => 1).getSnapshot().choice).toBeNull();
    expect(createConsentStore(memoryStorage({ [CONSENT_STORAGE_KEY]: "{broken" }), () => 1).getSnapshot().choice).toBeNull();
  });

  it("works for the visit when storage is missing or throws", () => {
    const throwing = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    for (const storage of [null, throwing]) {
      const store = createConsentStore(storage);
      expect(store.getSnapshot().choice).toBeNull();
      store.grant();
      expect(store.getSnapshot().choice).toBe("granted");
    }
  });

  it("notifies subscribers and opens and closes the settings without changing the decision", () => {
    const store = createConsentStore(memoryStorage(), () => 1);
    let calls = 0;
    const unsubscribe = store.subscribe(() => { calls += 1; });

    store.deny();
    store.openSettings();
    expect(store.getSnapshot()).toEqual({ choice: "denied", settingsOpen: true });
    store.closeSettings();
    expect(store.getSnapshot()).toEqual({ choice: "denied", settingsOpen: false });
    expect(calls).toBe(3);

    unsubscribe();
    store.grant();
    expect(calls).toBe(3);
  });
});

describe("Google Analytics loader", () => {
  it("denies everything by default, then grants only analytics storage, before configuring", () => {
    const env = fakeEnvironment();

    loadAnalytics("G-TEST123456", env);

    const sent = commands(env.win);
    expect(sent[0]).toEqual(["consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" }]);
    expect(sent[1]?.[0]).toBe("js");
    expect(sent[2]).toEqual(["consent", "update", { analytics_storage: "granted" }]);
    expect(sent[3]).toEqual(["config", "G-TEST123456", { allow_google_signals: false, allow_ad_personalization_signals: false }]);
    expect(env.scripts).toEqual([{ async: true, src: "https://www.googletagmanager.com/gtag/js?id=G-TEST123456" }]);
  });

  it("pushes the arguments object that gtag.js expects, not an array", () => {
    const env = fakeEnvironment();
    loadAnalytics("G-TEST123456", env);
    for (const entry of env.win.dataLayer ?? []) {
      expect(Object.prototype.toString.call(entry)).toBe("[object Arguments]");
    }
  });

  it("loads the script once and only re-enables measuring when called again", () => {
    const env = fakeEnvironment();
    loadAnalytics("G-TEST123456", env);
    disableAnalytics("G-TEST123456", env);
    expect(env.win["ga-disable-G-TEST123456"]).toBe(true);

    loadAnalytics("G-TEST123456", env);

    expect(env.scripts).toHaveLength(1);
    expect(env.win["ga-disable-G-TEST123456"]).toBe(false);
    expect(commands(env.win).at(-1)).toEqual(["consent", "update", { analytics_storage: "granted" }]);
  });

  it("stops measuring on withdrawal: disable flag, denied storage and removed cookies", () => {
    const env = fakeEnvironment("_ga=GA1.1.1; _ga_ABC123XYZ9=GS1.1; other=1");
    loadAnalytics("G-TEST123456", env);

    disableAnalytics("G-TEST123456", env);

    expect(env.win["ga-disable-G-TEST123456"]).toBe(true);
    expect(commands(env.win).at(-1)).toEqual(["consent", "update", { analytics_storage: "denied" }]);
    const expired = env.cookieWrites.filter((write) => write.includes("expires=Thu, 01 Jan 1970"));
    expect(expired.some((write) => write.startsWith("_ga=;") && write.includes("domain=.createyourminifig.com"))).toBe(true);
    expect(expired.some((write) => write.startsWith("_ga_ABC123XYZ9=;"))).toBe(true);
    expect(expired.some((write) => write.startsWith("other="))).toBe(false);
  });

  it("derives the cookie domains of a host down to two labels", () => {
    expect(cookieDomains("createyourminifig.com")).toEqual(["createyourminifig.com", ".createyourminifig.com"]);
    expect(cookieDomains("www.createyourminifig.com")).toEqual([
      "www.createyourminifig.com", ".www.createyourminifig.com", "createyourminifig.com", ".createyourminifig.com",
    ]);
  });

  it("removes only Google Analytics cookies", () => {
    const env = fakeEnvironment("session=1; _ga=1; _gid=2; _gat_gtag_G_X=3; theme=dark");
    deleteAnalyticsCookies(env);
    const names = new Set(env.cookieWrites.map((write) => write.split("=")[0]));
    expect([...names].sort()).toEqual(["_ga", "_gat_gtag_G_X", "_gid"]);
  });
});

describe("connecting the decision to Google Analytics", () => {
  it("loads nothing while undecided or declined", () => {
    const env = fakeEnvironment();
    const store = createConsentStore(memoryStorage(), () => 1);
    connectConsent("G-TEST123456", store, env);
    expect(env.scripts).toHaveLength(0);
    expect(env.win.dataLayer).toBeUndefined();

    store.deny();
    expect(env.scripts).toHaveLength(0);
  });

  it("loads after consent, also from a stored decision, and stops on withdrawal", () => {
    const stored = memoryStorage({ [CONSENT_STORAGE_KEY]: JSON.stringify({ v: 1, choice: "granted", at: 1 }) });
    const env = fakeEnvironment("_ga=1");
    const store = createConsentStore(stored, () => 2);

    connectConsent("G-TEST123456", store, env);
    expect(env.scripts).toHaveLength(1);

    store.deny();
    expect(env.win["ga-disable-G-TEST123456"]).toBe(true);
    expect(env.cookieWrites.length).toBeGreaterThan(0);

    store.grant();
    expect(env.scripts).toHaveLength(1);
    expect(env.win["ga-disable-G-TEST123456"]).toBe(false);
  });
});
