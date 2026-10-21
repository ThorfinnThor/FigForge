const GTAG_SCRIPT = "https://www.googletagmanager.com/gtag/js";

type GtagWindow = Record<string, unknown> & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

export type AnalyticsEnvironment = {
  win: GtagWindow;
  doc: {
    createElement: (tag: "script") => { async: boolean; src: string };
    head: { append: (element: never) => void };
    cookie: string;
  };
  hostname: string;
};

/** Domains a cookie of this host can have been set for: the host and every parent down to two labels. */
export const cookieDomains = (hostname: string): string[] => {
  const labels = hostname.split(".");
  const domains: string[] = [];
  for (let start = 0; start <= labels.length - 2; start += 1) domains.push(labels.slice(start).join("."));
  return domains.flatMap((domain) => [domain, `.${domain}`]);
};

const isAnalyticsCookie = (name: string): boolean => /^_ga(?:_|$)/u.test(name) || name === "_gid" || name.startsWith("_gat");

/** Removes the cookies Google Analytics sets. They are first-party and live on the site's own domain. */
export const deleteAnalyticsCookies = (env: Pick<AnalyticsEnvironment, "doc" | "hostname">): void => {
  const names = env.doc.cookie.split(";").map((part) => part.split("=")[0]?.trim() ?? "").filter(isAnalyticsCookie);
  for (const name of names) {
    for (const domain of cookieDomains(env.hostname)) {
      env.doc.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
    }
    env.doc.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
};

const ensureGtag = (win: GtagWindow): ((...args: unknown[]) => void) => {
  win.dataLayer = win.dataLayer ?? [];
  const dataLayer = win.dataLayer;
  if (!win.gtag) {
    // gtag.js only understands the arguments object, not an array.
    win.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      dataLayer.push(arguments);
    };
  }
  return win.gtag;
};

/**
 * Loads Google Analytics 4. Call this only after the visitor agreed. Advertising storage and
 * personalisation stay denied, and Google signals and ad personalisation are off.
 */
export const loadAnalytics = (id: string, env: AnalyticsEnvironment): void => {
  if (env.win[`ga-loaded-${id}`] === true) {
    env.win[`ga-disable-${id}`] = false;
    ensureGtag(env.win)("consent", "update", { analytics_storage: "granted" });
    return;
  }
  env.win[`ga-loaded-${id}`] = true;
  env.win[`ga-disable-${id}`] = false;
  const gtag = ensureGtag(env.win);
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
  gtag("js", new Date());
  gtag("consent", "update", { analytics_storage: "granted" });
  gtag("config", id, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = env.doc.createElement("script");
  script.async = true;
  script.src = `${GTAG_SCRIPT}?id=${encodeURIComponent(id)}`;
  env.doc.head.append(script as never);
};

/** Stops measuring at once and removes the cookies; nothing more is sent after this. */
export const disableAnalytics = (id: string, env: AnalyticsEnvironment): void => {
  env.win[`ga-disable-${id}`] = true;
  if (env.win.gtag) env.win.gtag("consent", "update", { analytics_storage: "denied" });
  deleteAnalyticsCookies(env);
};
