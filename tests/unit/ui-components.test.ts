import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "../../src/components/ui/Button.js";
import { Card } from "../../src/components/ui/Card.js";
import { StatusMessage } from "../../src/components/ui/StatusMessage.js";
import { TextInput } from "../../src/components/ui/TextInput.js";

describe("FF-12 shared UI primitives", () => {
  it("renders accessible button, input, card and status states", () => {
    const button = renderToStaticMarkup(createElement(Button, {
      loading: true,
      variant: "primary",
      children: "Prüfen",
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

    expect(tokens).toContain("--bg-app: #f5f6f4");
    expect(tokens).toContain("--green: #087f63");
    expect(tokens).toContain("--lime: #d5ff45");
    expect(tokens).toContain("--radius-md: 12px");
    expect(tokens).not.toContain("fonts.googleapis.com");
  });
});
