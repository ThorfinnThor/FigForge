import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { messages } from "../../src/i18n.js";
import { PRIVACY_SECTIONS } from "../../src/privacy/privacy-content.js";

describe("legal notices", () => {
  it("names the controller in the privacy notice and points to the imprint, in both languages", async () => {
    for (const language of ["de", "en"] as const) {
      const controller = PRIVACY_SECTIONS[language].find(({ id }) => id === "controller");
      const text = [...(controller?.paragraphs ?? [])].join(" ");
      expect(text, language).toContain("SeitenHafen361");
      expect(text, language).toContain("Schayan Yousefian");
      expect(text, language).toContain("contact@createyourminifig.com");
      expect(text, language).toContain("](/impressum)");
    }
    const page = await readFile("src/components/PrivacyPage.tsx", "utf8");
    expect(page).toContain("path(part.href)");
  });

  it("says in both languages that FigForge is independent and that LEGO does not endorse it", () => {
    expect(messages.de["landing.legal"]).toContain("keiner Verbindung zur LEGO Gruppe");
    expect(messages.de["landing.legal"]).toContain("weder sponsert noch autorisiert oder unterstützt");
    expect(messages.en["landing.legal"]).toContain("not affiliated with the LEGO Group");
    expect(messages.en["landing.legal"]).toContain("does not sponsor, authorize or endorse");
  });

  it("shows the short notice on the landing and sets pages and the full one in the imprint", async () => {
    expect(await readFile("src/components/LandingPage.tsx", "utf8")).toContain('t("landing.legal")');
    expect(await readFile("src/components/ProductsPage.tsx", "utf8")).toContain('t("landing.legal")');
    expect(await readFile("src/components/ImprintPage.tsx", "utf8")).toContain('t("imprint.trademark.lego")');
  });
});
