import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "../../src/components/ui/Button.js";
import { Card } from "../../src/components/ui/Card.js";
import { StatusMessage } from "../../src/components/ui/StatusMessage.js";
import { TextInput } from "../../src/components/ui/TextInput.js";
import { I18nProvider } from "../../src/i18n.js";

describe("FF-12 shared UI primitives", () => {
  it("renders accessible button, input, card and status states", () => {
    const button = renderToStaticMarkup(createElement(I18nProvider, {
      children: createElement(Button, {
        loading: true,
        variant: "primary",
        children: "Prüfen",
      }),
    }));
    const input = renderToStaticMarkup(createElement(TextInput, {
      error: "Bitte einen Begriff eingeben.",
      hint: "Mindestens drei Zeichen.",
      label: "Teil suchen",
      value: "",
      onChange: () => undefined,
    }));
    const card = renderToStaticMarkup(createElement(Card, { selected: true, children: "Karte" }));
    const status = renderToStaticMarkup(createElement(StatusMessage, { tone: "danger", children: "Nicht verfügbar." }));

    expect(button).toContain('class="ff-button ff-button--primary ff-button--md"');
    expect(button).toContain('aria-busy="true"');
    expect(button).toContain("Lädt …");
    expect(input).toContain('aria-invalid="true"');
    expect(input).toContain("Bitte einen Begriff eingeben.");
    expect(input).toContain("Mindestens drei Zeichen.");
    expect(card).toContain('data-selected="true"');
    expect(card).toContain("ff-card--selected");
    expect(status).toContain('role="status"');
    expect(status).toContain("ff-status--danger");
  });

  it("keeps the design tokens local and deterministic", async () => {
    const tokens = await readFile("src/styles/tokens.css", "utf8");

    expect(tokens).toContain("--peg: #b98655");
    expect(tokens).toContain("--navy: #1d2748");
    expect(tokens).toContain("--card: #fffdf8");
    expect(tokens).toContain("--signal: #f4c21b");
    expect(tokens).toContain("--cat-head: #f4c21b");
    expect(tokens).toContain("--cat-headwear: #2f6fd0");
    expect(tokens).toContain("--cat-torso: #e0452f");
    expect(tokens).toContain("--cat-legs: #2f9460");
    expect(tokens).toContain("--cat-accessory: #8a52c7");
    expect(tokens).toContain('--font-display: "Lilita One"');
    expect(tokens).toContain('--font-body: "Rubik"');
    expect(tokens).toContain("--focus-ring: #1d2748");
    expect(tokens).toContain("--radius-md: 12px");
    expect(tokens).not.toContain("--lime");
    expect(tokens).not.toContain("--green");
    expect(tokens).not.toContain("fonts.googleapis.com");
  });
});
