import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { DEFAULT_MEASUREMENT_ID, resolveMeasurementId } from "../../src/consent/measurement-id.js";

describe("consent banner", () => {
  it("switches on only with a valid measurement ID: the committed one is empty or well-formed", async () => {
    const committed: string = DEFAULT_MEASUREMENT_ID;
    expect(committed === "" || resolveMeasurementId() === committed).toBe(true);
    const config = await readFile("src/consent/analytics-config.ts", "utf8");
    expect(config).toContain("resolveMeasurementId(import.meta.env.VITE_GA_MEASUREMENT_ID)");
    const banner = await readFile("src/components/ConsentBanner.tsx", "utf8");
    expect(banner).toContain("const visible = ANALYTICS_ENABLED && store !== null");
    const main = await readFile("src/main.tsx", "utf8");
    expect(main).toContain("if (ANALYTICS_ENABLED && ANALYTICS_ID && consent)");
  });

  it("gives Allow and Decline the same look and keeps Google out of the HTML shell", async () => {
    const banner = await readFile("src/components/ConsentBanner.tsx", "utf8");
    expect(banner).toContain('onClick={() => store.grant()} variant="secondary"');
    expect(banner).toContain('onClick={() => store.deny()} variant="secondary"');
    const shell = await readFile("index.html", "utf8");
    expect(shell).not.toMatch(/googletagmanager|google-analytics|gtag/iu);
  });

  it("allows only the Google hosts Analytics needs in the content security policy", async () => {
    const headers = await readFile("public/_headers", "utf8");
    const csp = /Content-Security-Policy: (.*)/u.exec(headers)?.[1] ?? "";
    expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval' https://*.googletagmanager.com;");
    expect(csp).toContain("connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com;");
    expect(csp).toContain("img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com;");
    expect(csp).toContain("default-src 'self';");
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval(?!')/u);
  });
});
